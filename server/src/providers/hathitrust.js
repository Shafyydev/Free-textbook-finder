import { SearchResult, OPTION_TYPE, withTimeout } from './types.js';

export const PROVIDER_NAME = 'hathitrust';

const BASE_URL = 'https://catalog.hathitrust.org/api/volumes/brief';

export async function search(query, { limit = 10 } = {}) {
  // HathiTrust Bibliographic API is identifier-based, not keyword search.
  // We search by ISBN if the query looks like an ISBN, otherwise return empty.
  const isbnMatch = query.match(/\b\d{9}[\dX]|\d{13}\b/);
  if (!isbnMatch) {
    return [];
  }

  const isbn = isbnMatch[0].replace(/[-/\s]/g, '');
  const url = `${BASE_URL}/isbn/${encodeURIComponent(isbn)}.json`;

  let data;
  try {
    data = await withTimeout(fetch(url, { headers: { Accept: 'application/json' } }), 5000);
  } catch (err) {
    console.warn(`HathiTrust provider failed: ${err.message}`);
    return [];
  }

  if (!data.ok) {
    console.warn(`HathiTrust provider returned ${data.status}`);
    return [];
  }

  const json = await data.json();
  const records = json.records || {};
  const items = json.items || [];

  const results = [];
  for (const recordNumber of Object.keys(records)) {
    const record = records[recordNumber];
    const title = record.titles?.[0] || 'Unknown Title';
    const authors = []; // HathiTrust brief API doesn't include authors directly
    const isbns = record.isbns || [];
    const oclcs = record.oclcs || [];

    const matchingItems = items.filter(item => item.fromRecord === recordNumber);

    for (const item of matchingItems.slice(0, limit)) {
      const result = new SearchResult({ title, authors, isbn: isbns[0] || null, cover_url: null });

      const rightsCode = item.rightsCode || '';
      const usRightsString = item.usRightsString || '';
      const itemUrl = item.itemURL || `https://catalog.hathitrust.org/Record/${recordNumber}`;

      // Determine access status based on rights code
      if (rightsCode === 'pd' || rightsCode === 'pd-usr' || usRightsString?.toLowerCase().includes('full view')) {
        result.status = 'free';
        result.addOption({
          source: 'HathiTrust',
          type: OPTION_TYPE.READ,
          url: itemUrl,
          license: 'Public domain',
          price: null
        });
      } else if (rightsCode === 'ic' || usRightsString?.toLowerCase().includes('limited')) {
        result.status = 'borrow';
        result.addOption({
          source: 'HathiTrust',
          type: OPTION_TYPE.BORROW,
          url: itemUrl,
          license: 'Limited (search-only)',
          price: null
        });
      } else if (rightsCode === 'nn' || rightsCode === 'na') {
        result.status = 'paid';
        result.addOption({
          source: 'HathiTrust',
          type: OPTION_TYPE.BUY,
          url: itemUrl,
          license: 'Copyright restricted',
          price: null
        });
      } else {
        result.status = 'unknown';
        result.addOption({
          source: 'HathiTrust',
          type: OPTION_TYPE.READ,
          url: itemUrl,
          license: 'Unknown',
          price: null
        });
      }

      // Add site metadata
      result.site_type = 'library';
      result.favicon = 'https://catalog.hathitrust.org/favicon.ico';
      result.snippet = `HathiTrust record ${recordNumber}`;

      results.push(result);
    }
  }

  return results;
}
