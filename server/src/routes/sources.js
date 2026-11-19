import express from 'express';
import pool from '../db/pool.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, name, base_url, notes FROM sources ORDER BY name ASC');
    res.json(rows);
  } catch (err) { next(err); }
});

export default router;
