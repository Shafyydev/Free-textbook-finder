import { SearchResult, OPTION_TYPE, withTimeout } from './types.js';

export const PROVIDER_NAME = 'openstax';

const BASE_URL = 'https://openstax.org/apps/cms/api/v2/pages';

export async function search(query, { limit = 10 } = {}) {
  // First, get the list of live books
  let listData;
  try {
    listData = await withTimeout(
      fetch(`${BASE_URL}/?type=books.Book&limit=250&fields=title,meta.html_url,meta.detail_url,meta.slug&locale=en`, {
        headers: { Accept: 'application/json' }
      }),
      5000
    );
  } catch (err) {
    console.warn(`OpenStax list provider failed: ${err.message}`);
    return [];
  }

  if (!listData.ok) {
    console.warn(`OpenStax list returned ${listData.status}`);
    return [];
  }

  const listJson = await listData.json();
  const items = listData.items || [];

  // Filter for live books matching the query
  const liveItems = items.filter(i => i.book_state === 'live' && i.meta);
  const queryLower = query.toLowerCase();
  const matched = liveItems.filter(i =>
    i.title.toLowerCase().includes(queryLower) ||
    (i.meta.slug && i.meta.slug.toLowerCase().includes(queryLower))
  );

  const results = [];
  // Process up to limit matches in parallel (but limited)
  for (const item of matched.slice(0, limit)) {
    try {
      const detail = await fetchBookDetail(item.meta.detail_url);
      if (!detail) continue;

      const title = detail.title || item.title || 'Unknown Title';
      const authors = extractAuthors(detail.authors);
      const coverUrl = null; // OpenStax CMS doesn't provide cover URLs in this endpoint
      const license = detail.license_name || 'Unknown';
      const licenseUrl = detail.license_url || null;
      const officialUrl = detail.meta?.html_url || item.meta.html_url || '';
      const pdfUrl = detail.pdf_url || null;

      const result = new SearchResult({ title, authors, cover_url: coverUrl });

      if (license.toLowerCase().includes('creative commons') || license.toLowerCase().includes('public domain')) {
        result.status = 'free';
        if (pdfUrl) {
          result.addOption({
            source: 'OpenStax',
            type: OPTION_TYPE.DOWNLOAD,
            url: pdfUrl,
            license,
            price: null
          });
        }
        result.addOption({
          source: 'OpenStax',
          type: OPTION_TYPE.READ,
          url: officialUrl,
          license,
          licenseUrl,
          price: null
        });
      } else {
        result.status = 'paid';
        result.addOption({
          source: 'OpenStax',
          type: OPTION_TYPE.BUY,
          url: officialUrl,
          license,
          licenseUrl,
          price: null
        });
      }

      // Add site metadata for UI rendering
      result.site_type = 'open_repository';
      result.favicon = 'https://openstax.org/favicon.ico';
      result.snippet = description || `OpenStax textbook: "${title}" by ${Array.isArray(authors) ? authors.join(', ') : authors || ''}`;

      results.push(result);
    } catch (err) {
      console.warn(`OpenStax detail fetch failed for ${item.title}: ${err.message}`);
    }
  }

  return results;
}

async function fetchBookDetail(detailUrl) {
  try {
    const res = await withTimeout(fetch(detailUrl, { headers: { Accept: 'application/json' } }), 5000);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function extractAuthors(authorsArray) {
  if (!Array.isArray(authorsArray)) return [];
  return authorsArray
    .filter(a => a.type === 'author' && a.value && a.value.name)
    .map(a => a.value.name);
}
