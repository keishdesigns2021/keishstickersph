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
    category: row.category,
    price: row.price,
    description: row.description,
    imagePath: row.image_data || '',
    featured: !!Number(row.featured),
    createdAt: row.created_at,
  };
}

// Public: list products, optional ?category=
router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query;
    const result = category
      ? await client.execute({ sql: 'SELECT * FROM products WHERE category = ? ORDER BY created_at DESC', args: [category] })
      : await client.execute('SELECT * FROM products ORDER BY created_at DESC');
    res.json(result.rows.map(serialize));
  } catch (err) {
    next(err);
  }
});

// Public: single product
router.get('/:id', async (req, res, next) => {
  try {
    const result = await client.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [req.params.id] });
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(serialize(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

// Admin: create product
router.post('/', requireAdmin, upload.single('image'), async (req, res, next) => {
  try {
    const { name, category, price, description, featured } = req.body || {};
    if (!name || !category || price === undefined) {
      return res.status(400).json({ error: 'name, category, and price are required' });
    }
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: 'price must be a non-negative number' });
    }
    const imageData = req.file ? toDataUri(req.file) : '';
    const result = await client.execute({
      sql: `INSERT INTO products (name, category, price, description, image_data, featured)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [name, category, priceNum, description || '', imageData, featured ? 1 : 0],
    });
    const row = await client.execute({
      sql: 'SELECT * FROM products WHERE id = ?',
      args: [result.lastInsertRowid],
    });
    res.status(201).json(serialize(row.rows[0]));
  } catch (err) {
    next(err);
  }
});

// Admin: update product
router.put('/:id', requireAdmin, upload.single('image'), async (req, res, next) => {
  try {
    const existingResult = await client.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [req.params.id] });
    const existing = existingResult.rows[0];
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const { name, category, price, description, featured } = req.body || {};
    const priceNum = price !== undefined ? Number(price) : existing.price;
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: 'price must be a non-negative number' });
    }

    const imageData = req.file ? toDataUri(req.file) : existing.image_data;

    await client.execute({
      sql: `UPDATE products
            SET name = ?, category = ?, price = ?, description = ?, image_data = ?, featured = ?
            WHERE id = ?`,
      args: [
        name ?? existing.name,
        category ?? existing.category,
        priceNum,
        description ?? existing.description,
        imageData,
        featured !== undefined ? (featured ? 1 : 0) : existing.featured,
        req.params.id,
      ],
    });

    const row = await client.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [req.params.id] });
    res.json(serialize(row.rows[0]));
  } catch (err) {
    next(err);
  }
});

// Admin: delete product
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const existingResult = await client.execute({ sql: 'SELECT id FROM products WHERE id = ?', args: [req.params.id] });
    if (!existingResult.rows.length) return res.status(404).json({ error: 'Product not found' });
    await client.execute({ sql: 'DELETE FROM products WHERE id = ?', args: [req.params.id] });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
