const express = require('express');
const { client } = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// Public: submit an inquiry
router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'name, email, and message are required' });
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }
    await client.execute({
      sql: 'INSERT INTO inquiries (name, email, phone, message) VALUES (?, ?, ?, ?)',
      args: [name, email, phone || '', message],
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Admin: list inquiries
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const result = await client.execute('SELECT * FROM inquiries ORDER BY created_at DESC');
    res.json(
      result.rows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        email: r.email,
        phone: r.phone,
        message: r.message,
        created_at: r.created_at,
        read: !!Number(r.read),
      }))
    );
  } catch (err) {
    next(err);
  }
});

// Admin: mark inquiry as read
router.put('/:id/read', requireAdmin, async (req, res, next) => {
  try {
    await client.execute({ sql: 'UPDATE inquiries SET read = 1 WHERE id = ?', args: [req.params.id] });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Admin: delete inquiry
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    await client.execute({ sql: 'DELETE FROM inquiries WHERE id = ?', args: [req.params.id] });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
