import { SearchResult, OPTION_TYPE, normalizeIsbn, withTimeout } from './types.js';

export const PROVIDER_NAME = 'google-books';

const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

export async function search(query, { limit = 10, apiKey } = {}) {
  const params = new URLSearchParams({
    q: query,
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
    return [];
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
        url: vi.infoLink || '',
        license: 'Public domain',
        price: null
      });
      if (ai.pdf?.isAvailable) {
        result.addOption({
          source: 'Google Books',
          type: OPTION_TYPE.DOWNLOAD,
          url: ai.pdf.acsTokenLink || vi.infoLink || '',
          license: 'Public domain',
          price: null
        });
      }
      if (ai.epub?.isAvailable) {
        result.addOption({
          source: 'Google Books',
          type: OPTION_TYPE.DOWNLOAD,
          url: ai.epub.acsTokenLink || vi.infoLink || '',
          license: 'Public domain',
          price: null
        });
      }
    } else if (saleability === 'FOR_SALE') {
      result.status = 'paid';
      result.addOption({
        source: 'Google Books',
        type: OPTION_TYPE.BUY,
        url: vi.infoLink || '',
        license: 'Paid - commercial',
        price: listPrice ? `${listPrice.amount} ${listPrice.currencyCode}` : null
      });
    } else if (viewability === 'PARTIAL') {
      // Limited preview is not free access - treat as unknown
      result.status = 'unknown';
      result.addOption({
        source: 'Google Books',
        type: OPTION_TYPE.READ,
        url: vi.infoLink || '',
        license: 'Limited preview - not free',
        price: null
      });
    } else {
      result.status = 'unknown';
      result.addOption({
        source: 'Google Books',
        type: OPTION_TYPE.READ,
        url: vi.infoLink || '',
        license: 'Unknown',
        price: null
      });
    }

    results.push(result);
  }

  return results;
}

function extractIsbn(industryIdentifiers) {
  if (!Array.isArray(industryIdentifiers)) return null;
  const isbn13 = industryIdentifiers.find(i => i.type === 'ISBN_13');
  const isbn10 = industryIdentifiers.find(i => i.type === 'ISBN_10');
  return normalizeIsbn(isbn13?.identifier || isbn10?.identifier);
}
