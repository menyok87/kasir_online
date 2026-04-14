const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/categories - Daftar semua kategori
router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM categories ORDER BY name').all();
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/categories - Buat kategori baru
router.post('/', (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama kategori wajib diisi' });
    }
    const stmt = db.prepare('INSERT INTO categories (name) VALUES (?)');
    const result = stmt.run(name.trim());
    const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Nama kategori sudah digunakan' });
    }
    next(err);
  }
});

// PUT /api/categories/:id - Update kategori
router.put('/:id', (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama kategori wajib diisi' });
    }
    const result = db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    res.json(row);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Nama kategori sudah digunakan' });
    }
    next(err);
  }
});

// DELETE /api/categories/:id - Hapus kategori (jika tidak ada produk)
router.delete('/:id', (req, res, next) => {
  try {
    const productCount = db.prepare(
      'SELECT COUNT(*) as cnt FROM products WHERE category_id = ? AND is_active = 1'
    ).get(req.params.id);
    if (productCount.cnt > 0) {
      return res.status(409).json({ error: `Kategori masih memiliki ${productCount.cnt} produk aktif` });
    }
    const result = db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    res.json({ message: 'Kategori berhasil dihapus' });
  } catch (err) { next(err); }
});

module.exports = router;
