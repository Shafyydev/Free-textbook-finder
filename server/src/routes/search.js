import express from 'express';
import { searchBooks } from '../providers/index.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const result = await searchBooks(q.trim(), { limit: limit ? parseInt(limit, 10) : 20 });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
