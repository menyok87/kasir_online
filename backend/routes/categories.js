const express = require('express');
const router = express.Router();
const pool = require('../database/db');

// GET /api/categories - Daftar semua kategori
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/categories - Buat kategori baru
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama kategori wajib diisi' });
    }
    const { rows } = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Nama kategori sudah digunakan' });
    }
    next(err);
  }
});

// PUT /api/categories/:id - Update kategori
router.put('/:id', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama kategori wajib diisi' });
    }
    const { rows } = await pool.query(
      'UPDATE categories SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Nama kategori sudah digunakan' });
    }
    next(err);
  }
});

// DELETE /api/categories/:id - Hapus kategori (jika tidak ada produk)
router.delete('/:id', async (req, res, next) => {
  try {
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*)::int as cnt FROM products WHERE category_id = $1 AND is_active = TRUE',
      [req.params.id]
    );
    if (countRows[0].cnt > 0) {
      return res.status(409).json({ error: `Kategori masih memiliki ${countRows[0].cnt} produk aktif` });
    }
    const { rows } = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    res.json({ message: 'Kategori berhasil dihapus' });
  } catch (err) { next(err); }
});

module.exports = router;
