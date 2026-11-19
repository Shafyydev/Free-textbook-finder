import pool from '../db/pool.js';
import { SearchResult, OPTION_TYPE, mergeResults, withTimeout } from './types.js';
import { search as localSearch, PROVIDER_NAME as LOCAL_NAME } from './local.js';
import { search as googleBooksSearch, PROVIDER_NAME as GOOGLE_NAME } from './google-books.js';
import { search as openstaxSearch, PROVIDER_NAME as OPENAX_NAME } from './openstax.js';
import { search as doabSearch, PROVIDER_NAME as DOAB_NAME } from './doab.js';
import { search as openLibrarySearch, PROVIDER_NAME as OPEN_LIBRARY_NAME } from './open-library.js';
import { search as gutenbergSearch, PROVIDER_NAME as GUTENBERG_NAME } from './gutenberg.js';
import { search as ncbiSearch, PROVIDER_NAME as NCBI_NAME } from './ncbi.js';

const PROVIDERS = [
  { name: LOCAL_NAME, search: localSearch },
  { name: GOOGLE_NAME, search: googleBooksSearch },
  { name: OPENAX_NAME, search: openstaxSearch },
  { name: DOAB_NAME, search: doabSearch },
  { name: OPEN_LIBRARY_NAME, search: openLibrarySearch },
  { name: GUTENBERG_NAME, search: gutenbergSearch },
  { name: NCBI_NAME, search: ncbiSearch }
];

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PROVIDER_TIMEOUT_MS = 5000;

export async function searchBooks(query, { limit = 20, userIp } = {}) {
  if (!query || !query.trim()) {
    return { results: [], total: 0, providers: [] };
  }

  const trimmedQuery = query.trim();

  // Check cache for each provider
  const cachedResults = await getCachedResults(trimmedQuery);
  const providersToFetch = PROVIDERS.filter(p => !cachedResults.has(p.name));

  // Fetch from providers not in cache (in parallel with timeout)
  const fetchPromises = providersToFetch.map(async (provider) => {
    try {
      const apiKey = provider.name === GOOGLE_NAME ? process.env.GOOGLE_BOOKS_API_KEY :
                     provider.name === NCBI_NAME ? process.env.NCBI_API_KEY : null;
      const results = await withTimeout(
        provider.search(trimmedQuery, { limit, apiKey }),
        PROVIDER_TIMEOUT_MS
      );
      return { provider: provider.name, results };
    } catch (err) {
      console.warn(`Provider ${provider.name} failed: ${err.message}`);
      return { provider: provider.name, results: [], error: err.message };
    }
  });

  const providerResults = await Promise.all(fetchPromises);

  // Cache the results
  await cacheResults(trimmedQuery, providerResults);

  // Merge cached + freshly fetched results
  const allResults = [];
  for (const [name, results] of cachedResults) {
    allResults.push(...results.map(r => ({ ...r, _provider: name })));
  }
  for (const { provider, results } of providerResults) {
    allResults.push(...results.map(r => ({ ...r, _provider: provider })));
  }

  // Merge duplicates
  const merged = mergeResults(allResults.map(r => new SearchResult({
    title: r.title,
    authors: r.authors,
    isbn: r.isbn,
    cover_url: r.cover_url,
    status: r.status,
    options: r.options
  })));

  // Apply admin overrides (categories_locked etc. - not applicable here, but keep structure)
  // Limit results
  const limited = merged.slice(0, limit);

  // Log the search
  const hasFreeResult = limited.some(r => r.status === 'free');
  await logSearch(trimmedQuery, hasFreeResult, limited.length);

  return {
    results: limited,
    total: merged.length,
    providers: providerResults.map(p => ({ name: p.provider, count: p.results.length }))
  };
}

async function getCachedResults(query) {
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
}

async function cacheResults(query, providerResults) {
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
}

async function logSearch(query, hasFreeResult, resultCount) {
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
}

export { SearchResult, OPTION_TYPE, mergeResults };
