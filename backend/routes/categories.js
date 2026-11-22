const express = require('express');
const router  = express.Router();
const pool    = require('../database/db');
const { authenticate, requireAdmin, tenantId } = require('../middleware/authMiddleware');

// GET /api/categories — hanya kategori milik tenant
router.get('/', authenticate, async (req, res, next) => {
  try {
    const tid = tenantId(req.user);
    const { rows } = await pool.query(
      'SELECT * FROM categories WHERE admin_id = $1 ORDER BY name',
      [tid]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/categories
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nama kategori wajib diisi' });
    const tid = tenantId(req.user);
    const { rows } = await pool.query(
      'INSERT INTO categories (name, admin_id) VALUES ($1, $2) RETURNING *',
      [name.trim(), tid]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Nama kategori sudah digunakan' });
    next(err);
  }
});

// PUT /api/categories/:id
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nama kategori wajib diisi' });
    const tid = tenantId(req.user);
    const { rows } = await pool.query(
      'UPDATE categories SET name = $1 WHERE id = $2 AND admin_id = $3 RETURNING *',
      [name.trim(), req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Nama kategori sudah digunakan' });
    next(err);
  }
});

// DELETE /api/categories/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const tid = tenantId(req.user);
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*)::int as cnt FROM products WHERE category_id = $1 AND is_active = TRUE AND admin_id = $2',
      [req.params.id, tid]
    );
    if (countRows[0].cnt > 0) {
      return res.status(409).json({ error: `Kategori masih memiliki ${countRows[0].cnt} produk aktif` });
    }
    const { rows } = await pool.query(
      'DELETE FROM categories WHERE id = $1 AND admin_id = $2 RETURNING id',
      [req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    res.json({ message: 'Kategori berhasil dihapus' });
  } catch (err) { next(err); }
});

module.exports = router;
