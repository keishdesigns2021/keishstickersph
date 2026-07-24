const express = require('express');
const multer = require('multer');
const { client } = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WEBP, or GIF images are allowed (max 2MB)'));
    }
    cb(null, true);
  },
});

function toDataUri(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

function serialize(row) {
  return {
    id: Number(row.id),
    name: row.name,
    price: row.price,
    description: row.description,
    imagePath: row.image_data || '',
    createdAt: row.created_at,
  };
}

// Public: list services
router.get('/', async (req, res, next) => {
  try {
    const result = await client.execute('SELECT * FROM services ORDER BY created_at DESC');
    res.json(result.rows.map(serialize));
  } catch (err) {
    next(err);
  }
});

// Admin: create service
router.post('/', requireAdmin, upload.single('image'), async (req, res, next) => {
  try {
    const { name, price, description } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    const imageData = req.file ? toDataUri(req.file) : '';
    const result = await client.execute({
      sql: `INSERT INTO services (name, price, description, image_data) VALUES (?, ?, ?, ?)`,
      args: [name, price || '', description || '', imageData],
    });
    const row = await client.execute({ sql: 'SELECT * FROM services WHERE id = ?', args: [result.lastInsertRowid] });
    res.status(201).json(serialize(row.rows[0]));
  } catch (err) {
    next(err);
  }
});

// Admin: update service
router.put('/:id', requireAdmin, upload.single('image'), async (req, res, next) => {
  try {
    const existingResult = await client.execute({ sql: 'SELECT * FROM services WHERE id = ?', args: [req.params.id] });
    const existing = existingResult.rows[0];
    if (!existing) return res.status(404).json({ error: 'Service not found' });

    const { name, price, description } = req.body || {};
    const imageData = req.file ? toDataUri(req.file) : existing.image_data;

    await client.execute({
      sql: `UPDATE services SET name = ?, price = ?, description = ?, image_data = ? WHERE id = ?`,
      args: [name ?? existing.name, price ?? existing.price, description ?? existing.description, imageData, req.params.id],
    });

    const row = await client.execute({ sql: 'SELECT * FROM services WHERE id = ?', args: [req.params.id] });
    res.json(serialize(row.rows[0]));
  } catch (err) {
    next(err);
  }
});

// Admin: delete service
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const existingResult = await client.execute({ sql: 'SELECT id FROM services WHERE id = ?', args: [req.params.id] });
    if (!existingResult.rows.length) return res.status(404).json({ error: 'Service not found' });
    await client.execute({ sql: 'DELETE FROM services WHERE id = ?', args: [req.params.id] });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
