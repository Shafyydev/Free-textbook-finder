import { SearchResult, OPTION_TYPE, normalizeIsbn, withTimeout } from './types.js';

export const PROVIDER_NAME = 'google-books';

const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

export async function search(query, { limit = 10, apiKey, isbn } = {}) {
  const variants = buildQueryVariants(query, isbn);
  const allResults = [];
  const variantStats = [];

  for (const variant of variants) {
    try {
      const results = await searchSingleVariant(variant.q, {
        limit: Math.ceil(limit / Math.max(variants.length, 1)),
        apiKey
      });
      variantStats.push({ query: variant.q, count: results.length });
      results.forEach(r => allResults.push(r));
    } catch (err) {
      console.warn(`Google Books variant "${variant.q}" failed: ${err.message}`);
      variantStats.push({ query: variant.q, count: 0, error: err.message });
    }
  }

  console.log(`Google Books variant results: ${JSON.stringify(variantStats)}`);

  return allResults;
}

async function searchSingleVariant(q, { limit = 10, apiKey } = {}) {
  const params = new URLSearchParams({
    q: q,
    maxResults: String(Math.min(limit, 40)),
    ...(apiKey ? { key: apiKey } : {})
  });
  const url = `${BASE_URL}?${params}`;

  let data;
  try {
    data = await withTimeout(fetch(url, { headers: { Accept: 'application/json' } }), 5000);
  } catch (err) {
    console.warn(`Google Books provider failed: ${err.message}`);
    return [];
  }

  if (!data.ok) {
    console.warn(`Google Books provider returned ${data.status}`);
    throw new Error(`Google Books API returned ${data.status} (check GOOGLE_BOOKS_API_KEY in .env)`);
  }

  const json = await data.json();
  const items = json.items || [];

  const results = [];
  for (const item of items) {
    const vi = item.volumeInfo || {};
    const si = item.saleInfo || {};
    const ai = item.accessInfo || {};

    const title = vi.title || 'Unknown Title';
    const authors = vi.authors || [];
    const isbn = extractIsbn(vi.industryIdentifiers);
    const coverUrl = vi.imageLinks?.thumbnail || vi.imageLinks?.smallThumbnail || null;
    const infoLink = vi.infoLink || '';
    const canonicalLink = vi.canonicalVolumeLink || vi.infoLink || '';
    const buyLink = si.buyLink || '';

    const result = new SearchResult({ title, authors, isbn, cover_url: coverUrl });

    // Determine status and options
    const viewability = ai.viewability; // 'ALL_PAGES', 'PARTIAL', 'NO_PAGES'
    const isPublicDomain = ai.publicDomain === true;
    const saleability = si.saleability; // 'FOR_SALE', 'FREE', 'NOT_FOR_SALE'
    const listPrice = si.listPrice;

    // Public domain = free
    if (isPublicDomain || viewability === 'ALL_PAGES') {
      result.status = 'free';
      result.addOption({
        source: 'Google Books',
        type: OPTION_TYPE.READ,
        url: infoLink,
        license: 'Public domain',
        price: null
      });
      if (ai.pdf?.isAvailable) {
        result.addOption({
          source: 'Google Books',
          type: OPTION_TYPE.DOWNLOAD,
          url: ai.pdf.acsTokenLink || infoLink,
          license: 'Public domain',
          price: null
        });
      }
      if (ai.epub?.isAvailable) {
        result.addOption({
          source: 'Google Books',
          type: OPTION_TYPE.DOWNLOAD,
          url: ai.epub.acsTokenLink || infoLink,
          license: 'Public domain',
          price: null
        });
      }
    } else if (saleability === 'FOR_SALE') {
      result.status = 'paid';
      // "Buy on Google Play Books" using buyLink
      if (buyLink) {
        result.addOption({
          source: 'Google Books',
          type: OPTION_TYPE.BUY,
          url: buyLink,
          license: 'Paid - commercial',
          price: listPrice ? `${listPrice.amount} ${listPrice.currencyCode}` : null
        });
      }
      // "View on Google Books" using infoLink or canonicalVolumeLink
      result.addOption({
        source: 'Google Books',
        type: OPTION_TYPE.READ,
        url: canonicalLink,
        license: 'Paid - commercial',
        price: listPrice ? `${listPrice.amount} ${listPrice.currencyCode}` : null
      });
    } else if (viewability === 'PARTIAL') {
      // Limited preview is not free access - treat as unknown
      result.status = 'unknown';
      result.addOption({
        source: 'Google Books',
        type: OPTION_TYPE.READ,
        url: infoLink,
        license: 'Limited preview - not free',
        price: null
      });
    } else {
      result.status = 'unknown';
      result.addOption({
        source: 'Google Books',
        type: OPTION_TYPE.READ,
        url: infoLink,
        license: 'Unknown',
        price: null
      });
    }

    // Add site metadata for UI rendering
    result.site_type = 'retailer';
    result.favicon = 'https://books.google.com/favicon.ico';
    result.snippet = vi.description || `Search result from Google Books for "${title}"`;

    results.push(result);
  }

  return results;
}

function buildQueryVariants(query, isbn) {
  const variants = [{ q: query }];

  // intitle: variant - all important words in title
  const words = query.split(/\s+/).filter(w => w.length > 0);
  const intitleQuery = words.map(w => `intitle:${w}`).join(' ');
  if (intitleQuery !== query) {
    variants.push({ q: intitleQuery });
  }

  // ISBN variant if an ISBN was detected (or query looks like an ISBN)
  const isbnQuery = isbn || extractIsbnFromQuery(query);
  if (isbnQuery) {
    variants.push({ q: `isbn:${isbnQuery}` });
  }

  return variants;
}

function extractIsbnFromQuery(query) {
  const match = query.match(/\b\d{9}[\dXx]|\d{13}\b/);
  return match ? match[0].replace(/[-/\s]/g, '').toUpperCase() : null;
}

function extractIsbn(industryIdentifiers) {
  if (!Array.isArray(industryIdentifiers)) return null;
  const isbn13 = industryIdentifiers.find(i => i.type === 'ISBN_13');
  const isbn10 = industryIdentifiers.find(i => i.type === 'ISBN_10');
  return normalizeIsbn(isbn13?.identifier || isbn10?.identifier);
}
