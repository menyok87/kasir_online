const express = require('express');
const router  = express.Router();
const pool    = require('../database/db');
const { requireAdmin } = require('../middleware/authMiddleware');

// GET /api/settings — ambil pengaturan toko (semua role)
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM store_settings WHERE id = 1');
    if (rows.length === 0) {
      // Buat baris default jika belum ada
      const { rows: inserted } = await pool.query(
        'INSERT INTO store_settings (id) VALUES (1) RETURNING *'
      );
      return res.json(inserted[0]);
    }
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/settings — simpan pengaturan toko (admin only)
router.put('/', requireAdmin, async (req, res, next) => {
  try {
    const {
      store_name, store_tagline, store_address,
      store_phone, store_email, store_website,
      footer_msg, show_footer_note,
    } = req.body;

    if (!store_name?.trim()) {
      return res.status(400).json({ error: 'Nama toko wajib diisi' });
    }

    const { rows } = await pool.query(`
      INSERT INTO store_settings
        (id, store_name, store_tagline, store_address, store_phone, store_email, store_website, footer_msg, show_footer_note, updated_at)
      VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (id) DO UPDATE SET
        store_name       = EXCLUDED.store_name,
        store_tagline    = EXCLUDED.store_tagline,
        store_address    = EXCLUDED.store_address,
        store_phone      = EXCLUDED.store_phone,
        store_email      = EXCLUDED.store_email,
        store_website    = EXCLUDED.store_website,
        footer_msg       = EXCLUDED.footer_msg,
        show_footer_note = EXCLUDED.show_footer_note,
        updated_at       = NOW()
      RETURNING *
    `, [
      store_name.trim(),
      store_tagline?.trim() || '',
      store_address?.trim() || '',
      store_phone?.trim()   || '',
      store_email?.trim()   || '',
      store_website?.trim() || '',
      footer_msg?.trim()    || '',
      show_footer_note !== false,
    ]);

    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
