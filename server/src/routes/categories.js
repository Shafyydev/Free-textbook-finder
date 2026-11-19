import express from 'express';
import pool from '../db/pool.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, name FROM categories ORDER BY name ASC');
    res.json(rows);
  } catch (err) { next(err); }
});

export default router;
