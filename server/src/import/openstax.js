import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CC_BY = 'Creative Commons Attribution 4.0 International';
const CC_BY_URL = 'https://creativecommons.org/licenses/by/4.0/';
const CC_BY_NC_SA = 'Creative Commons Attribution-NonCommercial-ShareAlike License';
const CC_BY_NC_SA_URL = 'https://creativecommons.org/licenses/by-nc-sa/4.0/';

// Map OpenStax subject keywords to general categories
function subjectToCategory(subjects) {
  const s = subjects.map(x => x.toLowerCase()).join(' ');
  if (s.includes('nursing') || s.includes('pharmacology') || s.includes('anatomy') || s.includes('physiology') || s.includes('health') || s.includes('medical') || s.includes('palliative') || s.includes('maternal') || s.includes('newborn') || s.includes('psychiatric') || s.includes('population') || s.includes('nutrition')) {
    return 'Medicine and Health';
  }
  if (s.includes('mathematics') || s.includes('algebra') || s.precalculus || s.includes('statistics') || s.includes('calculus')) {
    return 'Mathematics';
  }
  if (s.includes('biology') || s.includes('chemistry') || s.includes('physics')) {
    return 'Science';
  }
  if (s.includes('accounting') || s.includes('management') || s.includes('marketing') || s.includes('finance') || s.includes('economics') || s.includes('business') || s.includes('organizational')) {
    return 'Business';
  }
  if (s.includes('history') || s.includes('writing') || s.includes('humanities')) {
    return 'Humanities';
  }
  if (s.includes('psychology') || s.includes('sociology') || s.includes('political')) {
    return 'Social Sciences';
  }
  return 'Science';
}

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function ensureSource(client, name, base_url, notes) {
  const { rows } = await client.query(
    `INSERT INTO sources (name, base_url, notes) VALUES ($1,$2,$3)
     ON CONFLICT (name) DO UPDATE SET base_url=EXCLUDED.base_url, notes=EXCLUDED.notes
     RETURNING id`, [name, base_url || null, notes || null]
  );
  return rows[0].id;
}

async function ensureSubject(client, name) {
  const { rows } = await client.query(
    `INSERT INTO subjects (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`, [name]
  );
  return rows[0].id;
}

async function ensureCategory(client, name) {
  const { rows } = await client.query(
    `INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`, [name]
  );
  return rows[0].id;
}

async function verifyPdf(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/pdf') || ct.includes('application/x-pdf')) return true;
  } catch {}
  try {
    const res = await fetch(url, { method: 'GET' });
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/pdf') || ct.includes('application/x-pdf')) return true;
  } catch {}
  return false;
}

async function importOpenStax() {
  const limit = 250;
  let offset = 0;
  let added = 0, updated = 0, skipped = 0;
  const skipReasons = {};

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    while (true) {
      const apiUrl = `https://openstax.org/apps/cms/api/v2/pages/?type=books.Book&limit=${limit}&offset=${offset}&locale=en`;
      const res = await fetch(apiUrl);
      const json = await res.json();
      const items = json.items || [];
      if (!items.length) break;

      for (const item of items) {
        if (item.book_state !== 'live') {
          skipped++;
          skipReasons['not_live'] = (skipReasons['not_live'] || 0) + 1;
          continue;
        }
        if (!item.meta || !item.meta.html_url) {
          skipped++;
          skipReasons['no_html_url'] = (skipReasons['no_html_url'] || 0) + 1;
          continue;
        }
        if (!item.license_name || !item.license_url) {
          skipped++;
          skipReasons['no_license'] = (skipReasons['no_license'] || 0) + 1;
          continue;
        }

        // Fetch detail page for pdf_url
        const detailUrl = item.meta.detail_url;
        let pdfUrl = null;
        try {
          const dres = await fetch(detailUrl);
          const djson = await dres.json();
          pdfUrl = djson.pdf_url || null;
        } catch {
          // detail page unavailable, skip PDF
        }

        let verifiedPdf = null;
        if (pdfUrl) {
          verifiedPdf = await verifyPdf(pdfUrl) ? pdfUrl : null;
          if (!verifiedPdf) {
            skipReasons['pdf_not_verified'] = (skipReasons['pdf_not_verified'] || 0) + 1;
          }
        }

        const license = item.license_name;
        const licenseUrl = item.license_url;
        const title = item.title;
        const authors = item.authors || null;
        const edition = item.edition || null;
        const year = item.publication_date ? new Date(item.publication_date).getFullYear() : null;
        const description = item.description || null;
        const subjects = item.subjects || [];
        const category = subjectToCategory(subjects);

        // Check if book exists
        const existing = await client.query(
          'SELECT id FROM books WHERE lower(title)=lower($1) AND coalesce(edition,\'\')=coalesce($2,\'\')',
          [title, edition || null]
        );

        if (existing.rowCount) {
          const bookId = existing.rows[0].id;
          await client.query(
            'UPDATE books SET authors=$2, year=$3, description=$4, cover_url=$5, updated_at=NOW() WHERE id=$1',
            [bookId, authors, year, description, null]
          );
          // Update sources
          await client.query('DELETE FROM book_sources WHERE book_id=$1', [bookId]);
          await client.query('DELETE FROM book_subjects WHERE book_id=$1', [bookId]);
          await client.query('DELETE FROM book_categories WHERE book_id=$1', [bookId]);

          const sourceId = await ensureSource(client, 'OpenStax', 'https://openstax.org', null);
          await client.query(
            `INSERT INTO book_sources (book_id, source_id, official_url, direct_file_url, license, license_url, can_host, link_status, last_checked_at, access_type)
             VALUES ($1,$2,$3,$4,$5,$6,false,'unknown',NOW(),'free')`,
            [bookId, sourceId, item.meta.html_url, verifiedPdf, license, licenseUrl]
          );
          for (const s of subjects) {
            const sid = await ensureSubject(client, s);
            await client.query('INSERT INTO book_subjects (book_id, subject_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [bookId, sid]);
          }
          const catId = await ensureCategory(client, category);
          await client.query('INSERT INTO book_categories (book_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [bookId, catId]);
          await client.query('SELECT refresh_book_search_vector($1)', [bookId]);
          updated++;
        } else {
          const ins = await client.query(
            'INSERT INTO books (title, authors, edition, year, description, cover_url, featured) VALUES ($1,$2,$3,$4,$5,$6,false) RETURNING id',
            [title, authors, edition, year, description, null]
          );
          const bookId = ins.rows[0].id;

          const sourceId = await ensureSource(client, 'OpenStax', 'https://openstax.org', null);
          await client.query(
            `INSERT INTO book_sources (book_id, source_id, official_url, direct_file_url, license, license_url, can_host, link_status, last_checked_at, access_type)
             VALUES ($1,$2,$3,$4,$5,$6,false,'unknown',NOW(),'free')`,
            [bookId, sourceId, item.meta.html_url, verifiedPdf, license, licenseUrl]
          );
          for (const s of subjects) {
            const sid = await ensureSubject(client, s);
            await client.query('INSERT INTO book_subjects (book_id, subject_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [bookId, sid]);
          }
          const catId = await ensureCategory(client, category);
          await client.query('INSERT INTO book_categories (book_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [bookId, catId]);
          await client.query('SELECT refresh_book_search_vector($1)', [bookId]);
          added++;
        }
      }

      offset += limit;
      if (offset >= (json.meta && json.meta.total_count ? json.meta.total_count : 0)) break;
    }

    // Clean up orphaned records
    await client.query(`DELETE FROM subjects WHERE NOT EXISTS (SELECT 1 FROM book_subjects bs WHERE bs.subject_id = subjects.id)`);
    await client.query(`DELETE FROM categories WHERE NOT EXISTS (SELECT 1 FROM book_categories bc WHERE bc.category_id = categories.id)`);
    await client.query(`DELETE FROM sources WHERE NOT EXISTS (SELECT 1 FROM book_sources bsrc WHERE bsrc.source_id = sources.id)`);

    await client.query('COMMIT');
    console.log(`OpenStax import complete: ${added} added, ${updated} updated, ${skipped} skipped`);
    if (Object.keys(skipReasons).length) {
      console.log('Skip reasons:', JSON.stringify(skipReasons, null, 2));
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

importOpenStax().catch(err => { console.error(err); process.exit(1); });
