import { SearchResult, OPTION_TYPE, withTimeout } from './types.js';

export const PROVIDER_NAME = 'doab';

const BASE_URL = 'https://directory.doabooks.org/rest/search';

export async function search(query, { limit = 10 } = {}) {
  let data;
  try {
    data = await withTimeout(
      fetch(`${BASE_URL}?query=${encodeURIComponent(query)}&expand=metadata,bitstreams`, {
        headers: { Accept: 'application/json' }
      }),
      5000
    );
  } catch (err) {
    console.warn(`DOAB provider failed: ${err.message}`);
    return [];
  }

  if (!data.ok) {
    console.warn(`DOAB provider returned ${data.status}`);
    return [];
  }

  const json = await data.json();
  // DOAB DSpace REST API returns content in _embedded or as array
  const items = json._embedded?.searchResult?._embedded?.object || json._embedded?.object || [];

  const results = [];
  for (const item of items.slice(0, limit)) {
    try {
      const metadata = extractMetadata(item._embedded?.metadata || []);
      const bitstreams = item._embedded?.bitstreams?._embedded?.object || [];

      const title = metadata.find(m => m.metadata_key === 'dc.title')?.metadata_value || 'Unknown Title';
      const authors = metadata
        .filter(m => m.metadata_key === 'dc.contributor.author')
        .map(m => m.metadata_value);
      const license = metadata.find(m => m.metadata_key === 'dc.rights')?.metadata_value || 'Unknown';
      const isbn = metadata.find(m => m.metadata_key === 'dc.identifier.isbn')?.metadata_value || null;

      // Find download URL from bitstreams
      const downloadUrl = bitstreams.find(b => b.name?.toLowerCase().endsWith('.pdf'))?._links?.self?.href || null;
      const handle = metadata.find(m => m.metadata_key === 'dc.identifier.uri')?.metadata_value || null;
      const officialUrl = handle || `https://directory.doabooks.org/handle/${item.uuid || ''}`;

      const result = new SearchResult({ title, authors, isbn, cover_url: null });

      // DOAB is open access, so all are free
      result.status = 'free';
      if (downloadUrl) {
        result.addOption({
          source: 'DOAB',
          type: OPTION_TYPE.DOWNLOAD,
          url: downloadUrl,
          license,
          price: null
        });
      }
      result.addOption({
        source: 'DOAB',
        type: OPTION_TYPE.READ,
        url: officialUrl,
        license,
        price: null
      });

      results.push(result);
    } catch (err) {
      console.warn(`DOAB item processing failed: ${err.message}`);
    }
  }

  return results;
}

function extractMetadata(metadataArray) {
  if (!Array.isArray(metadataArray)) return [];
  return metadataArray;
}
