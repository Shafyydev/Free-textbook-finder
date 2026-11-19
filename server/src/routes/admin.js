import express from 'express';
import pool from '../db/pool.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();
router.use(adminAuth);

function parseId(v) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Books
router.post('/books', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { title, authors, edition, year, description, cover_url, subject_ids = [], course_ids = [] } = req.body || {};
    if (!title || typeof title !== 'string') return res.status(400).json({ error: 'title is required' });
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO books (title, authors, edition, year, description, cover_url) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [title.trim(), authors || null, edition || null, year || null, description || null, cover_url || null]
    );
    const book = rows[0];
    if (Array.isArray(subject_ids)) {
      for (const sid of subject_ids) {
        await client.query('INSERT INTO book_subjects (book_id, subject_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [book.id, sid]);
      }
    }
    if (Array.isArray(course_ids)) {
      for (const cid of course_ids) {
        await client.query('INSERT INTO book_courses (book_id, course_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [book.id, cid]);
      }
    }
    await client.query('SELECT refresh_book_search_vector($1)', [book.id]);
    await client.query('COMMIT');
    res.status(201).json(book);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

router.put('/books/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { title, authors, edition, year, description, cover_url, subject_ids, course_ids } = req.body || {};
    await client.query('BEGIN');
    const { rowCount, rows } = await client.query(
      `UPDATE books SET title=COALESCE($2,title), authors=$3, edition=$4, year=$5, description=$6, cover_url=$7, updated_at=NOW() WHERE id=$1 RETURNING *`,
      [id, title || null, authors ?? null, edition ?? null, year ?? null, description ?? null, cover_url ?? null]
    );
    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Book not found' });
    }
    if (Array.isArray(subject_ids)) {
      await client.query('DELETE FROM book_subjects WHERE book_id=$1', [id]);
      for (const sid of subject_ids) await client.query('INSERT INTO book_subjects (book_id, subject_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, sid]);
    }
    if (Array.isArray(course_ids)) {
      await client.query('DELETE FROM book_courses WHERE book_id=$1', [id]);
      for (const cid of course_ids) await client.query('INSERT INTO book_courses (book_id, course_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, cid]);
    }
    await client.query('SELECT refresh_book_search_vector($1)', [id]);
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// Toggle categories_locked on a book
router.patch('/books/:id/categories_locked', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { locked } = req.body || {};
    if (typeof locked !== 'boolean') return res.status(400).json({ error: 'locked must be a boolean' });
    const { rows, rowCount } = await pool.query(
      'UPDATE books SET categories_locked=$2 WHERE id=$1 RETURNING id, title, categories_locked',
      [id, locked]
    );
    if (!rowCount) return res.status(404).json({ error: 'Book not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});


router.delete('/books/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { rowCount } = await pool.query('DELETE FROM books WHERE id=$1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Book not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Book sources
router.post('/book-sources', async (req, res, next) => {
  try {
    const { book_id, source_id, official_url, direct_file_url, license, license_url, can_host, link_status, access_type } = req.body || {};
    if (!book_id || !source_id || !official_url || !license) return res.status(400).json({ error: 'book_id, source_id, official_url, license are required' });
    if (typeof official_url !== 'string' || official_url.length > 1000) return res.status(400).json({ error: 'Invalid official_url' });
    const validAccessTypes = ['free', 'paid'];
    const at = access_type && validAccessTypes.includes(access_type) ? access_type : 'free';
    const { rows } = await pool.query(
      `INSERT INTO book_sources (book_id, source_id, official_url, direct_file_url, license, license_url, can_host, link_status, access_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [book_id, source_id, official_url.trim(), direct_file_url || null, String(license).trim(), license_url || null, !!can_host, link_status || 'unknown', at]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/book-sources/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { book_id, source_id, official_url, direct_file_url, license, license_url, can_host, link_status, last_checked_at, access_type } = req.body || {};
    const validAccessTypes = ['free', 'paid'];
    const at = access_type && validAccessTypes.includes(access_type) ? access_type : null;
    const { rows, rowCount } = await pool.query(
      `UPDATE book_sources SET
        book_id=COALESCE($2,book_id), source_id=COALESCE($3,source_id), official_url=COALESCE($4,official_url),
        direct_file_url=$5, license=COALESCE($6,license), license_url=$7, can_host=COALESCE($8,can_host),
        link_status=COALESCE($9,link_status), last_checked_at=COALESCE($10,last_checked_at),
        access_type=COALESCE($11,access_type)
       WHERE id=$1 RETURNING *`,
      [id, book_id || null, source_id || null, official_url || null, direct_file_url ?? null, license || null, license_url ?? null, typeof can_host === 'boolean' ? can_host : null, link_status || null, last_checked_at || null, at]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/book-sources/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { rowCount } = await pool.query('DELETE FROM book_sources WHERE id=$1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Requests admin
router.get('/requests', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM book_requests ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { next(err); }
});

router.patch('/requests/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { status } = req.body || {};
    const allowed = ['new', 'found', 'rejected'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const { rows, rowCount } = await pool.query('UPDATE book_requests SET status=$2 WHERE id=$1 RETURNING *', [id, status]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

export default router;
