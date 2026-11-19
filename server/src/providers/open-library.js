import { SearchResult, OPTION_TYPE, withTimeout } from './types.js';

export const PROVIDER_NAME = 'open-library';

const SEARCH_URL = 'https://openlibrary.org/search.json';
const IA_SEARCH_URL = 'https://archive.org/advancedsearch.php';

export async function search(query, { limit = 10 } = {}) {
  let olData;
  try {
    olData = await withTimeout(
      fetch(`${SEARCH_URL}?q=${encodeURIComponent(query)}&fields=*,availability&limit=${Math.min(limit, 40)}`, {
        headers: { Accept: 'application/json' }
      }),
      5000
    );
  } catch (err) {
    console.warn(`Open Library provider failed: ${err.message}`);
    return [];
  }

  if (!olData.ok) {
    console.warn(`Open Library provider returned ${olData.status}`);
    return [];
  }

  const json = await olData.json();
  const docs = json.docs || [];

  const results = [];
  for (const doc of docs.slice(0, limit)) {
    try {
      const title = doc.title || 'Unknown Title';
      const authors = doc.author_name || [];
      const isbn = extractIsbn(doc.isbn);
      const coverId = doc.cover_i;
      const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null;
      const iaIds = doc.ia || [];
      const hasFulltext = doc.has_fulltext === true;
      const publicScan = doc.public_scan_b === true;

      const result = new SearchResult({ title, authors, isbn, cover_url: coverUrl });

      // Check Open Library availability for borrowing
      const availability = doc.availability || {};
      const isBorrowable = availability.status === 'borrowable' || availability.is_borrowable === true;
      const iaIdentifier = iaIds?.[0] || null;

      // has_fulltext/publicScan indicate availability but NOT explicit public domain/open license.
      // Per SPEC.md, only label "free" when the source explicitly states public domain or open license.
      // Open Library search API does not return an explicit license field, so treat as unknown.
      if (isBorrowable && iaIdentifier) {
        result.status = 'borrow';
        result.addOption({
          source: 'Internet Archive',
          type: OPTION_TYPE.BORROW,
          url: `https://archive.org/details/${iaIdentifier}`,
          license: 'Lending library',
          price: null
        });
      } else if (doc.key) {
        result.status = 'unknown';
        result.addOption({
          source: 'Open Library',
          type: OPTION_TYPE.READ,
          url: `https://openlibrary.org${doc.key}`,
          license: 'Unknown - no explicit license from Open Library API',
          price: null
        });
      }

      results.push(result);
    } catch (err) {
      console.warn(`Open Library item processing failed: ${err.message}`);
    }
  }

  return results;
}

function extractIsbn(isbnArray) {
  if (!Array.isArray(isbnArray)) return null;
  const isbn13 = isbnArray.find(i => /^\d{13}$/.test(i.replace(/[-/\s]/g, '')));
  const isbn10 = isbnArray.find(i => /^\d{10}$/.test(i.replace(/[-/\s]/g, '')));
  return isbn13?.replace(/[-/\s]/g, '') || isbn10?.replace(/[-/\s]/g, '') || null;
}
