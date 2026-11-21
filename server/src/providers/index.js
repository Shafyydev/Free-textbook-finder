import pool from '../db/pool.js';
import { SearchResult, OPTION_TYPE, mergeResults, withTimeout } from './types.js';
import { extractQueryWords, scoreResult } from './relevance.js';
import { cleanQuery, extractIsbn } from './cleaner.js';
import { classifyDomain, BLOCKED_DOMAIN_SET } from './domains.js';
import { search as localSearch, PROVIDER_NAME as LOCAL_NAME } from './local.js';
import { search as googleBooksSearch, PROVIDER_NAME as GOOGLE_NAME } from './google-books.js';
import { search as openstaxSearch, PROVIDER_NAME as OPENAX_NAME } from './openstax.js';
import { search as doabSearch, PROVIDER_NAME as DOAB_NAME } from './doab.js';
import { search as openLibrarySearch, PROVIDER_NAME as OPEN_LIBRARY_NAME } from './open-library.js';
import { search as gutenbergSearch, PROVIDER_NAME as GUTENBERG_NAME } from './gutenberg.js';
import { search as ncbiSearch, PROVIDER_NAME as NCBI_NAME } from './ncbi.js';
import { search as internetArchiveSearch, PROVIDER_NAME as INTERNET_ARCHIVE_NAME } from './internet-archive.js';
import { search as hathitrustSearch, PROVIDER_NAME as HATHITRUST_NAME } from './hathitrust.js';

const PROVIDERS = [
  { name: LOCAL_NAME, search: localSearch },
  { name: GOOGLE_NAME, search: googleBooksSearch },
  { name: OPENAX_NAME, search: openstaxSearch },
  { name: DOAB_NAME, search: doabSearch },
  { name: OPEN_LIBRARY_NAME, search: openLibrarySearch },
  { name: GUTENBERG_NAME, search: gutenbergSearch },
  { name: NCBI_NAME, search: ncbiSearch },
  { name: INTERNET_ARCHIVE_NAME, search: internetArchiveSearch },
  { name: HATHITRUST_NAME, search: hathitrustSearch }
];

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PROVIDER_TIMEOUT_MS = 5000;

// Relevance thresholds
const RELEVANCE_THRESHOLD = 0.7;
const RELEVANCE_FALLBACK_THRESHOLD = 0.5;

export async function searchBooks(query, { limit = 20, userIp } = {}) {
  if (!query || !query.trim()) {
    return { results: [], total: 0, providers: [], didYouMean: [], relevanceFallback: false };
  }

  const trimmedQuery = query.trim();
  const { cleanedQuery, isbn } = cleanQuery(trimmedQuery);
  const queryWords = extractQueryWords(cleanedQuery);

  // Check cache for each provider (keyed by the cleaned query)
  const cachedResults = await getCachedResults(cleanedQuery);
  const providersToFetch = PROVIDERS.filter(p => !cachedResults.has(p.name));

  // Fetch from providers not in cache (in parallel with timeout)
  const fetchPromises = providersToFetch.map(async (provider) => {
    try {
      const apiKey = provider.name === GOOGLE_NAME ? process.env.GOOGLE_BOOKS_API_KEY :
                     provider.name === NCBI_NAME ? process.env.NCBI_API_KEY : null;
      const results = await withTimeout(
        provider.search(cleanedQuery, { limit, apiKey, isbn }),
        PROVIDER_TIMEOUT_MS
      );
      return { provider: provider.name, results };
    } catch (err) {
      console.warn(`Provider ${provider.name} failed: ${err.message}`);
      return { provider: provider.name, results: [], error: err.message };
    }
  });

  const providerResults = await Promise.all(fetchPromises);

  // Merge cached + freshly fetched results (keyed by provider)
  const allProviderResults = new Map();
  for (const [name, results] of cachedResults) {
    allProviderResults.set(name, { provider: name, results });
  }
  for (const pr of providerResults) {
    allProviderResults.set(pr.provider, pr);
  }

  // Build provider status: raw count, after blocklist, after relevance.
  // Also keep the after-blocklist results per provider for merging.
  const providerStatus = [];
  const perProviderAfterBlocklist = new Map();
  let totalRaw = 0;
  let totalAfterBlocklist = 0;

  for (const p of PROVIDERS) {
    const pr = allProviderResults.get(p.name);
    if (!pr) {
      providerStatus.push({ name: p.name, count: 0, afterBlocklist: 0, afterRelevance: 0, status: 'empty' });
      perProviderAfterBlocklist.set(p.name, []);
      continue;
    }
    if (pr.error) {
      providerStatus.push({ name: pr.provider, count: 0, afterBlocklist: 0, afterRelevance: 0, status: 'failed', error: pr.error });
      perProviderAfterBlocklist.set(p.name, []);
      continue;
    }

    const rawCount = pr.results.length;
    totalRaw += rawCount;

    // Apply blocklist to this provider's results
    const afterBlocklistResults = pr.results.filter(r => !isBlocked(r, p.name));
    const afterBlocklist = afterBlocklistResults.length;
    totalAfterBlocklist += afterBlocklist;
    perProviderAfterBlocklist.set(p.name, afterBlocklistResults);

    // Count how many pass relevance (scored on raw results)
    const passing = pr.results.filter(r => scoreResult(queryWords, r.title, r.authors).score >= RELEVANCE_THRESHOLD).length;

    providerStatus.push({
      name: pr.provider,
      count: rawCount,
      afterBlocklist,
      afterRelevance: passing,
      status: rawCount > 0 ? 'ok' : 'empty'
    });
  }

  // Cache the results
  await cacheResults(cleanedQuery, providerResults);

  // Merge all results (after blocklist) across providers
  const allResults = [];
  for (const [name, pr] of allProviderResults) {
    const filtered = perProviderAfterBlocklist.get(name) || [];
    allResults.push(...filtered.map(r => ({ ...r, _provider: name })));
  }

  const blockedCount = totalRaw - totalAfterBlocklist;

  // Merge duplicates
  const merged = mergeResults(allResults.map(r => new SearchResult({
    title: r.title,
    authors: r.authors,
    isbn: r.isbn,
    cover_url: r.cover_url,
    status: r.status,
    options: r.options,
    site_type: r.site_type || classifyDomain(r.options?.[0]?.url || ''),
    favicon: r.favicon || '/favicon.ico',
    snippet: r.snippet || ''
  })));

  // Apply relevance scoring against the cleaned query. When an ISBN lookup was
  // performed (cleaned query is empty), treat every result as relevant since the
  // ISBN is an exact identifier match.
  const isIsbnLookup = !!isbn && !cleanedQuery;
  const withScores = merged.map(r => {
    const score = scoreResult(queryWords, r.title, r.authors);
    return {
      ...r,
      _relevanceScore: isIsbnLookup ? 1.0 : score.score,
      _relevancePass70: isIsbnLookup || score.score >= RELEVANCE_THRESHOLD,
      _relevancePass50: isIsbnLookup || score.score >= RELEVANCE_FALLBACK_THRESHOLD
    };
  });

  const relevant70 = withScores.filter(r => r._relevancePass70);
  const relevant50 = withScores.filter(r => r._relevancePass50);

  let relevanceFallback = false;
  let relevant = relevant70;
  // If nothing passes the 70% rule but providers returned results, fall back
  // to 50% and mark them as possible matches (never show "Not found").
  if (relevant70.length === 0 && merged.length > 0) {
    relevant = relevant50;
    relevanceFallback = true;
  }

  // Sort by relevance score (best first)
  relevant.sort((a, b) => b._relevanceScore - a._relevanceScore);

  // Build "Did you mean" suggestions from near misses below 70%
  const didYouMean = [];
  if (relevant.length < 5) {
    const nearMisses = withScores
      .filter(r => !r._relevancePass70 && r._relevanceScore >= 0.3)
      .sort((a, b) => b._relevanceScore - a._relevanceScore)
      .slice(0, 3);
    didYouMean.push(...nearMisses.map(r => r.title));
  }

  // Limit results
  const limited = relevant.slice(0, limit);

  // Log the search
  const hasFreeResult = limited.some(r => r.status === 'free');
  await logSearch(cleanedQuery, hasFreeResult, limited.length);

  return {
    results: limited,
    total: relevant.length,
    providers: providerStatus,
    blockedCount,
    didYouMean,
    relevanceFallback
  };
}

function isBlocked(result, providerName) {
  const host = (providerName === 'Google Books' ? 'books.google.com' :
                providerName === 'Open Library' ? 'openlibrary.org' :
                providerName === 'OpenStax' ? 'openstax.org' :
                providerName === 'DOAB' ? 'directory.doabooks.org' :
                providerName === 'Gutenberg' ? 'gutendex.com' :
                providerName === 'NCBI' ? 'ncbi.nlm.nih.gov' :
                providerName === 'Internet Archive' ? 'archive.org' :
                providerName === 'HathiTrust' ? 'catalog.hathitrust.org' :
                providerName === 'local' ? 'local' : '');
  return BLOCKED_DOMAIN_SET.has(host);
}

async function getCachedResults(query) {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT provider, data FROM provider_cache
         WHERE query = $1 AND expires_at > NOW()`,
        [query]
      );
      const cache = new Map();
      for (const row of res.rows) {
        cache.set(row.provider, row.data);
      }
      return cache;
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn(`Cache read failed: ${err.message}`);
    return new Map();
  }
}

async function cacheResults(query, providerResults) {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const { provider, results } of providerResults) {
        if (!results || results.length === 0) continue;
        await client.query(
          `INSERT INTO provider_cache (provider, query, data, fetched_at, expires_at)
           VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '24 hours')
           ON CONFLICT (provider, query)
           DO UPDATE SET data = $3, fetched_at = NOW(), expires_at = NOW() + INTERVAL '24 hours'`,
          [provider, query, JSON.stringify(results)]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.warn(`Cache write failed: ${err.message}`);
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn(`Cache write failed: ${err.message}`);
  }
}

async function logSearch(query, hasFreeResult, resultCount) {
  try {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO search_query_log (query, has_free_result, result_count)
         VALUES ($1, $2, $3)`,
        [query, hasFreeResult, resultCount]
      );
    } catch (err) {
      console.warn(`Search log failed: ${err.message}`);
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn(`Search log failed: ${err.message}`);
  }
}

export { SearchResult, OPTION_TYPE, mergeResults, cleanQuery, extractIsbn };
