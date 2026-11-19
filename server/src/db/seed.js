import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
async function ensureCourse(client, name) {
  const { rows } = await client.query(
    `INSERT INTO courses (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`, [name]
  );
  return rows[0].id;
}

async function seed() {
  const seedPath = path.join(__dirname, 'seed', 'books.json');
  const books = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Remove books not in the current seed file (by title + edition)
    for (const b of books) {
      await client.query(
        `DELETE FROM books WHERE lower(title)=lower($1) AND coalesce(edition,'')<>coalesce($2,'')`,
        [b.title, b.edition || null]
      );
    }
    // Keep only books present in seed (by title + edition)
    const seedKeys = books.map(b => [b.title.toLowerCase(), b.edition || null]);
    if (seedKeys.length) {
      const placeholders = seedKeys.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(',');
      const flat = seedKeys.flat();
      await client.query(
        `DELETE FROM books WHERE NOT (lower(title), coalesce(edition,'')) IN (${placeholders})`,
        flat
      );
    }

    for (const b of books) {
      const existing = await client.query('SELECT id FROM books WHERE lower(title)=lower($1) AND coalesce(edition,\'\')=coalesce($2,\'\')', [b.title, b.edition || null]);
      let bookId;
      if (existing.rowCount) {
        bookId = existing.rows[0].id;
        await client.query('UPDATE books SET authors=$2, year=$3, description=$4, cover_url=$5, featured=$6, updated_at=NOW() WHERE id=$1',
          [bookId, b.authors || null, b.year || null, b.description || null, b.cover_url || null, b.featured || false]);
        await client.query('DELETE FROM book_subjects WHERE book_id=$1', [bookId]);
        await client.query('DELETE FROM book_courses WHERE book_id=$1', [bookId]);
        await client.query('DELETE FROM book_sources WHERE book_id=$1', [bookId]);
      } else {
        const ins = await client.query(
          'INSERT INTO books (title, authors, edition, year, description, cover_url, featured) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
          [b.title, b.authors || null, b.edition || null, b.year || null, b.description || null, b.cover_url || null, b.featured || false]
        );
        bookId = ins.rows[0].id;
      }
      for (const s of b.subjects || []) {
        const sid = await ensureSubject(client, s);
        await client.query('INSERT INTO book_subjects (book_id, subject_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [bookId, sid]);
      }
      for (const c of b.courses || []) {
        const cid = await ensureCourse(client, c);
        await client.query('INSERT INTO book_courses (book_id, course_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [bookId, cid]);
      }
      for (const src of b.sources || []) {
        const sourceId = await ensureSource(client, src.source_name, src.base_url || null, src.notes || null);
        await client.query(
          `INSERT INTO book_sources (book_id, source_id, official_url, direct_file_url, license, license_url, can_host, link_status, last_checked_at)
           VALUES ($1,$2,$3,$4,$5,$6,false,'unknown',NOW())`,
          [bookId, sourceId, src.official_url, src.direct_file_url || null, src.license, src.license_url || null]
        );
      }
      await client.query('SELECT refresh_book_search_vector($1)', [bookId]);
    }

    // Clean up orphaned subjects, courses, sources
    await client.query(`DELETE FROM subjects WHERE NOT EXISTS (SELECT 1 FROM book_subjects bs WHERE bs.subject_id = subjects.id)`);
    await client.query(`DELETE FROM courses WHERE NOT EXISTS (SELECT 1 FROM book_courses bc WHERE bc.course_id = courses.id)`);
    await client.query(`DELETE FROM sources WHERE NOT EXISTS (SELECT 1 FROM book_sources bsrc WHERE bsrc.source_id = sources.id)`);

    await client.query('COMMIT');
    console.log(`Seeded ${books.length} books`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error(err); process.exit(1); });
