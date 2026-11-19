import { SearchResult, OPTION_TYPE, withTimeout } from './types.js';

export const PROVIDER_NAME = 'ncbi';

const ESEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const ESUMMARY_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';
const ELINK_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi';

export async function search(query, { limit = 10, apiKey } = {}) {
  // Step 1: Search Bookshelf database for IDs
  let esearchData;
  try {
    const params = new URLSearchParams({
      db: 'books',
      term: query,
      retmode: 'json',
      retmax: String(Math.min(limit, 20)),
      ...(apiKey ? { api_key: apiKey } : {})
    });
    esearchData = await withTimeout(
      fetch(`${ESEARCH_URL}?${params}`, { headers: { Accept: 'application/json' } }),
      5000
    );
  } catch (err) {
    console.warn(`NCBI esearch failed: ${err.message}`);
    return [];
  }

  if (!esearchData.ok) {
    console.warn(`NCBI esearch returned ${esearchData.status}`);
    return [];
  }

  const esearchJson = await esearchData.json();
  const idList = esearchJson.esearchresult?.idlist || [];

  if (idList.length === 0) return [];

  // Step 2: Get summaries for the IDs
  let esummaryData;
  try {
    esummaryData = await withTimeout(
      fetch(`${ESUMMARY_URL}?db=books&id=${idList.join(',')}&retmode=json${apiKey ? `&api_key=${apiKey}` : ''}`, {
        headers: { Accept: 'application/json' }
      }),
      5000
    );
  } catch (err) {
    console.warn(`NCBI esummary failed: ${err.message}`);
    return [];
  }

  if (!esummaryData.ok) {
    console.warn(`NCBI esummary returned ${esummaryData.status}`);
    return [];
  }

  const esummaryJson = await esummaryData.json();
  const result = esummaryJson.result || {};

  const formatted = [];
  for (const uid of idList) {
    try {
      const doc = result[uid];
      if (!doc) continue;

      const title = doc.title || 'Unknown Title';
      const authors = doc.authors?.map(a => a.name).filter(Boolean) || [];
      const pubDate = doc.pubdate || null;

      // NCBI Bookshelf books are freely readable (open access)
      const resultItem = new SearchResult({
        title,
        authors,
        isbn: null,
        cover_url: null,
        status: 'free'
      });

      const bookshelfUrl = `https://www.ncbi.nlm.nih.gov/books/${doc.uid || uid}/`;

      resultItem.addOption({
        source: 'NCBI Bookshelf',
        type: OPTION_TYPE.READ,
        url: bookshelfUrl,
        license: 'Open access',
        price: null
      });

      formatted.push(resultItem);
    } catch (err) {
      console.warn(`NCBI item processing failed: ${err.message}`);
    }
  }

  return formatted;
}
