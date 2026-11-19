import { SearchResult, OPTION_TYPE, withTimeout } from './types.js';

export const PROVIDER_NAME = 'gutenberg';

const BASE_URL = 'https://gutendex.com/books';

export async function search(query, { limit = 10 } = {}) {
  let data;
  try {
    data = await withTimeout(
      fetch(`${BASE_URL}?search=${encodeURIComponent(query)}&mime_type=text%2F`, {
        headers: { Accept: 'application/json' }
      }),
      5000
    );
  } catch (err) {
    console.warn(`Gutenberg provider failed: ${err.message}`);
    return [];
  }

  if (!data.ok) {
    console.warn(`Gutenberg provider returned ${data.status}`);
    return [];
  }

  const json = await data.json();
  const results = json.results || [];

  const formatted = [];
  for (const book of results.slice(0, limit)) {
    try {
      const title = book.title || 'Unknown Title';
      const authors = book.authors?.map(a => a.name).filter(Boolean) || [];
      const gutId = book.id;
      const formats = book.formats || {};

      // Find PDF download URL
      const pdfUrl = formats['application/pdf'] || null;
      const epubUrl = formats['application/epub+zip'] || null;
      const htmlUrl = formats['text/html'] || null;

      // Gutenberg books are public domain
      const result = new SearchResult({
        title,
        authors,
        isbn: null,
        cover_url: null,
        status: 'free'
      });

      if (pdfUrl) {
        result.addOption({
          source: 'Project Gutenberg',
          type: OPTION_TYPE.DOWNLOAD,
          url: pdfUrl,
          license: 'Public domain',
          price: null
        });
      }
      if (epubUrl) {
        result.addOption({
          source: 'Project Gutenberg',
          type: OPTION_TYPE.DOWNLOAD,
          url: epubUrl,
          license: 'Public domain',
          price: null
        });
      }
      if (htmlUrl && !pdfUrl && !epubUrl) {
        result.addOption({
          source: 'Project Gutenberg',
          type: OPTION_TYPE.READ,
          url: htmlUrl,
          license: 'Public domain',
          price: null
        });
      }
      // Always add the Gutenberg page as a read option
      const gutenbergPage = `https://www.gutenberg.org/ebooks/${gutId}`;
      if (!result.options.find(o => o.url === gutenbergPage)) {
        result.addOption({
          source: 'Project Gutenberg',
          type: OPTION_TYPE.READ,
          url: gutenbergPage,
          license: 'Public domain',
          price: null
        });
      }

      formatted.push(result);
    } catch (err) {
      console.warn(`Gutenberg item processing failed: ${err.message}`);
    }
  }

  return formatted;
}
