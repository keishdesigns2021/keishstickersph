const express = require('express');
const multer = require('multer');
const { client } = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

const DEFAULTS = {
  logoImage: '',
  catalogTag: 'Full catalog',
  catalogHeading: 'All Products',
  catalogDescription: "Everything we print, in one place. Tap a category to filter.",
};

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

async function getSettings() {
  const result = await client.execute('SELECT key, value FROM site_settings');
  const stored = Object.fromEntries(result.rows.map((r) => [r.key, r.value]));
  return { ...DEFAULTS, ...stored };
}

// Public: fetch current site settings (with defaults filled in)
router.get('/', async (req, res, next) => {
  try {
    res.json(await getSettings());
  } catch (err) {
    next(err);
  }
});

// Admin: update settings (text fields + optional logo upload)
router.put('/', requireAdmin, upload.single('logo'), async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.catalogTag !== undefined) updates.catalogTag = req.body.catalogTag;
    if (req.body.catalogHeading !== undefined) updates.catalogHeading = req.body.catalogHeading;
    if (req.body.catalogDescription !== undefined) updates.catalogDescription = req.body.catalogDescription;
    if (req.file) {
      updates.logoImage = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    } else if (req.body.clearLogo === '1') {
      updates.logoImage = '';
    }

    for (const [key, value] of Object.entries(updates)) {
      await client.execute({
        sql: `INSERT INTO site_settings (key, value) VALUES (?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        args: [key, value],
      });
    }

    res.json(await getSettings());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
