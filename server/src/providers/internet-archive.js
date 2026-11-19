import { SearchResult, OPTION_TYPE, withTimeout } from './types.js';

export const PROVIDER_NAME = 'internet-archive';

const BASE_URL = 'https://archive.org/advancedsearch.php';

export async function search(query, { limit = 10 } = {}) {
  const params = new URLSearchParams({
    q: query,
    fl: ['identifier', 'title', 'creator', 'date', 'description', 'mediatype', 'access-restricted-item', 'licenseurl'],
    rows: String(Math.min(limit, 50)),
    output: 'json'
  });
  const url = `${BASE_URL}?${params}`;

  let data;
  try {
    data = await withTimeout(fetch(url, { headers: { Accept: 'application/json' } }), 5000);
  } catch (err) {
    console.warn(`Internet Archive provider failed: ${err.message}`);
    return [];
  }

  if (!data.ok) {
    console.warn(`Internet Archive provider returned ${data.status}`);
    return [];
  }

  const json = await data.json();
  const docs = json.response?.docs || [];

  const results = [];
  for (const doc of docs.slice(0, limit)) {
    try {
      const title = doc.title || 'Unknown Title';
      const creators = doc.creator || [];
      const identifier = doc.identifier || [];
      const isbn = extractIsbn(identifier);
      const description = doc.description || '';
      const accessRestricted = doc['access-restricted-item'] === true;
      const licenseUrl = doc.licenseurl || null;
      const date = doc.date || '';

      const result = new SearchResult({ title, authors: creators, isbn, cover_url: null });

      // Determine access status
      if (accessRestricted === true) {
        // Lending-only copy
        result.status = 'borrow';
        result.addOption({
          source: 'Internet Archive',
          type: OPTION_TYPE.BORROW,
          url: `https://archive.org/details/${identifier[0] || ''}`,
          license: 'Lending library',
          price: null
        });
      } else if (licenseUrl && (licenseUrl.toLowerCase().includes('creative commons') || licenseUrl.toLowerCase().includes('public domain'))) {
        result.status = 'free';
        result.addOption({
          source: 'Internet Archive',
          type: OPTION_TYPE.DOWNLOAD,
          url: `https://archive.org/download/${identifier[0] || ''}`,
          license,
          price: null
        });
        result.addOption({
          source: 'Internet Archive',
          type: OPTION_TYPE.READ,
          url: `https://archive.org/details/${identifier[0] || ''}`,
          license,
          price: null
        });
      } else {
        result.status = 'unknown';
        result.addOption({
          source: 'Internet Archive',
          type: OPTION_TYPE.READ,
          url: `https://archive.org/details/${identifier[0] || ''}`,
          license: 'Unknown',
          price: null
        });
      }

      // Add site metadata
      result.site_type = 'library';
      result.favicon = 'https://archive.org/favicon.ico';
      result.snippet = description || `Internet Archive item: "${title}"`;

      results.push(result);
    } catch (err) {
      console.warn(`Internet Archive item processing failed: ${err.message}`);
    }
  }

  return results;
}

function extractIsbn(identifiers) {
  if (!Array.isArray(identifiers)) return null;
  const isbn13 = identifiers.find(i => /^\d{13}$/.test(i.replace(/[-/\s]/g, '')));
  const isbn10 = identifiers.find(i => /^\d{10}$/.test(i.replace(/[-/\s]/g, '')));
  return isbn13?.replace(/[-/\s]/g, '') || isbn10?.replace(/[-/\s]/g, '') || null;
}
