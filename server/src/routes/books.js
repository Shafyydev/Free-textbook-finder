import express from 'express';
import pool from '../db/pool.js';

const router = express.Router();

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

router.get('/', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const subject = req.query.subject ? parsePositiveInt(req.query.subject, null) : null;
    const course = req.query.course ? parsePositiveInt(req.query.course, null) : null;
    const source = req.query.source ? parsePositiveInt(req.query.source, null) : null;
    const page = Math.max(1, parsePositiveInt(req.query.page, 1));
    const limit = Math.min(50, Math.max(1, parsePositiveInt(req.query.limit, 20)));
    const offset = (page - 1) * limit;

    const params = [];
    const where = [];
    let rankSelect = '0 AS rank';
    let orderBy = 'b.featured DESC, b.title ASC';

    if (q) {
      params.push(q);
      const qi = `$${params.length}`;
      rankSelect = `ts_rank(b.search_vector, plainto_tsquery('english', ${qi})) AS rank`;
      where.push(`b.search_vector @@ plainto_tsquery('english', ${qi})`);
      orderBy = 'rank DESC, b.title ASC';
    }
    if (subject) {
      params.push(subject);
      where.push(`EXISTS (SELECT 1 FROM book_subjects bs WHERE bs.book_id = b.id AND bs.subject_id = $${params.length})`);
    }
    if (course) {
      params.push(course);
      where.push(`EXISTS (SELECT 1 FROM book_courses bc WHERE bc.book_id = b.id AND bc.course_id = $${params.length})`);
    }
    if (source) {
      params.push(source);
      where.push(`EXISTS (SELECT 1 FROM book_sources bsrc WHERE bsrc.book_id = b.id AND bsrc.source_id = $${params.length})`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(limit);
    const limitIdx = `$${params.length}`;
    params.push(offset);
    const offsetIdx = `$${params.length}`;

    const listSql = `
      SELECT b.id, b.title, b.authors, b.edition, b.year, b.description, b.cover_url, b.featured,
             ${rankSelect},
             COALESCE(json_agg(DISTINCT jsonb_build_object('id', subj.id, 'name', subj.name))
               FILTER (WHERE subj.id IS NOT NULL), '[]') AS subjects,
             COUNT(DISTINCT bsrc.id)::int AS source_count,
             COALESCE(json_agg(DISTINCT bsrc.license) FILTER (WHERE bsrc.license IS NOT NULL), '[]') AS licenses,
             COALESCE(json_agg(DISTINCT jsonb_build_object(
               'id', bsrc.id, 'source_id', src.id, 'source_name', src.name,
               'official_url', bsrc.official_url, 'direct_file_url', bsrc.direct_file_url,
               'license', bsrc.license, 'access_type', bsrc.access_type
             )) FILTER (WHERE bsrc.id IS NOT NULL), '[]') AS sources
      FROM books b
      LEFT JOIN book_subjects bs ON bs.book_id = b.id
      LEFT JOIN subjects subj ON subj.id = bs.subject_id
      LEFT JOIN book_sources bsrc ON bsrc.book_id = b.id
      LEFT JOIN sources src ON src.id = bsrc.source_id
      ${whereSql}
      GROUP BY b.id
      ORDER BY ${orderBy}
      LIMIT ${limitIdx} OFFSET ${offsetIdx}
    `;

    const countParams = params.slice(0, params.length - 2);
    const countSql = `SELECT COUNT(*)::int AS total FROM books b ${whereSql}`;

    const [listRes, countRes] = await Promise.all([
      pool.query(listSql, params),
      pool.query(countSql, countParams)
    ]);

    res.json({
      items: listRes.rows,
      page,
      limit,
      total: countRes.rows[0]?.total || 0
    });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, null);
    if (!id) return res.status(400).json({ error: 'Invalid book id' });

    const bookRes = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    if (bookRes.rowCount === 0) return res.status(404).json({ error: 'Book not found' });

    const [subjectsRes, coursesRes, sourcesRes] = await Promise.all([
      pool.query(`SELECT s.id, s.name FROM subjects s JOIN book_subjects bs ON bs.subject_id = s.id WHERE bs.book_id = $1 ORDER BY s.name`, [id]),
      pool.query(`SELECT c.id, c.name FROM courses c JOIN book_courses bc ON bc.course_id = c.id WHERE bc.book_id = $1 ORDER BY c.name`, [id]),
      pool.query(`
        SELECT bsrc.id, bsrc.official_url, bsrc.direct_file_url, bsrc.license, bsrc.license_url,
               bsrc.can_host, bsrc.last_checked_at, bsrc.link_status, bsrc.access_type,
               s.id AS source_id, s.name AS source_name, s.base_url
        FROM book_sources bsrc
        JOIN sources s ON s.id = bsrc.source_id
        WHERE bsrc.book_id = $1
        ORDER BY s.name ASC
      `, [id])
    ]);

    res.json({
      ...bookRes.rows[0],
      subjects: subjectsRes.rows,
      courses: coursesRes.rows,
      sources: sourcesRes.rows
    });
  } catch (err) { next(err); }
});

export default router;
