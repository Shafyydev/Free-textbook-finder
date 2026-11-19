import express from 'express';
import pool from '../db/pool.js';

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const requested_title = typeof req.body.requested_title === 'string' ? req.body.requested_title.trim() : '';
    const notes = typeof req.body.notes === 'string' ? req.body.notes.trim() : null;
    const contact = typeof req.body.contact === 'string' ? req.body.contact.trim() : null;

    if (!requested_title) return res.status(400).json({ error: 'requested_title is required' });
    if (requested_title.length > 300) return res.status(400).json({ error: 'requested_title is too long' });
    if (notes && notes.length > 2000) return res.status(400).json({ error: 'notes is too long' });
    if (contact && contact.length > 200) return res.status(400).json({ error: 'contact is too long' });

    const { rows } = await pool.query(
      'INSERT INTO book_requests (requested_title, notes, contact) VALUES ($1, $2, $3) RETURNING id, requested_title, notes, contact, status, created_at',
      [requested_title, notes || null, contact || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

export default router;
