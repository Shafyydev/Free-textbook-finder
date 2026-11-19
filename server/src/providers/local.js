import pool from '../db/pool.js';
import { SearchResult, OPTION_TYPE } from './types.js';

// Provider name for caching
export const PROVIDER_NAME = 'local';

// Fetch local database books matching the query
export async function search(query, { limit = 20 } = {}) {
  const client = await pool.connect();
  try {
    // Full-text search on books table using the existing search_vector
    const sql = `
      SELECT DISTINCT b.id, b.title, b.authors, b.edition, b.year, b.description, b.cover_url, b.featured,
             s.id AS source_id, s.name AS source_name, s.base_url,
             bsrc.official_url, bsrc.direct_file_url, bsrc.license, bsrc.license_url,
             bsrc.can_host, bsrc.access_type
      FROM books b
      LEFT JOIN book_subjects bs ON bs.book_id = b.id
      LEFT JOIN subjects subj ON subj.id = bs.subject_id
      LEFT JOIN book_sources bsrc ON bsrc.book_id = b.id
      LEFT JOIN sources s ON s.id = bsrc.source_id
      WHERE b.search_vector @@ plainto_tsquery('english', $1)
         OR b.title ILIKE $2
         OR b.authors ILIKE $2
      ORDER BY b.featured DESC, b.title ASC
      LIMIT $3
    `;
    const qi = `%${query}%`;
    const res = await client.query(sql, [query, qi, limit]);

    // Group by book
    const books = new Map();
    for (const row of res.rows) {
      if (!books.has(row.id)) {
        books.set(row.id, {
          id: row.id,
          title: row.title,
          authors: row.authors ? row.authors.split(/,\s*/) : [],
          edition: row.edition,
          year: row.year,
          description: row.description,
          cover_url: row.cover_url,
          featured: row.featured,
          sources: []
        });
      }
      const book = books.get(row.id);
      if (row.source_id) {
        book.sources.push({
          source_name: row.source_name,
          official_url: row.official_url,
          direct_file_url: row.direct_file_url,
          license: row.license,
          license_url: row.license_url,
          access_type: row.access_type,
          can_host: row.can_host
        });
      }
    }

    const results = [];
    for (const book of books.values()) {
      const result = new SearchResult({
        title: book.title,
        authors: book.authors,
        cover_url: book.cover_url || null,
        status: determineStatus(book.sources)
      });

      for (const src of book.sources) {
        if (src.access_type === 'paid') {
          result.addOption({
            source: src.source_name,
            type: OPTION_TYPE.BUY,
            url: src.official_url,
            license: src.license || 'Paid - commercial',
            price: null
          });
        } else if (src.direct_file_url) {
          result.addOption({
            source: src.source_name,
            type: OPTION_TYPE.DOWNLOAD,
            url: src.direct_file_url,
            license: src.license || 'Unknown',
            price: null
          });
        } else if (src.official_url) {
          result.addOption({
            source: src.source_name,
            type: OPTION_TYPE.READ,
            url: src.official_url,
            license: src.license || 'Unknown',
            price: null
          });
        }
      }

      // Extract ISBN from license or description if present (local DB doesn't store ISBN)
      results.push(result);
    }

    return results;
  } finally {
    client.release();
  }
}

function determineStatus(sources) {
  if (!sources || sources.length === 0) return 'unknown';

  const hasFree = sources.some(s => s.access_type === 'free' && (s.direct_file_url || s.official_url));
  const hasPaid = sources.some(s => s.access_type === 'paid');

  if (hasFree) return 'free';
  if (hasPaid) return 'paid';
  return 'unknown';
}
