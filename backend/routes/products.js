const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/products - Daftar produk aktif
router.get('/', (req, res, next) => {
  try {
    const { category_id, search } = req.query;
    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
    `;
    const params = [];
    if (category_id) { query += ' AND p.category_id = ?'; params.push(category_id); }
    if (search) { query += ' AND p.name LIKE ?'; params.push(`%${search}%`); }
    query += ' ORDER BY p.name';
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/products/:id - Detail produk
router.get('/:id', (req, res, next) => {
  try {
    const row = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    res.json(row);
  } catch (err) { next(err); }
});

// POST /api/products - Buat produk baru
router.post('/', (req, res, next) => {
  try {
    const { name, category_id, price, stock, sku, image_url } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Nama produk wajib diisi' });
    if (price === undefined || price < 0) return res.status(400).json({ error: 'Harga tidak valid' });

    const stmt = db.prepare(`
      INSERT INTO products (name, category_id, price, stock, sku, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      name.trim(),
      category_id || null,
      Number(price),
      Number(stock) || 0,
      sku || null,
      image_url || null
    );
    const row = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'SKU sudah digunakan' });
    next(err);
  }
});

// PUT /api/products/:id - Update produk
router.put('/:id', (req, res, next) => {
  try {
    const { name, category_id, price, stock, sku, image_url } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Nama produk wajib diisi' });
    if (price === undefined || price < 0) return res.status(400).json({ error: 'Harga tidak valid' });

    const result = db.prepare(`
      UPDATE products
      SET name=?, category_id=?, price=?, stock=?, sku=?, image_url=?,
          updated_at=datetime('now','localtime')
      WHERE id=? AND is_active=1
    `).run(
      name.trim(),
      category_id || null,
      Number(price),
      Number(stock) || 0,
      sku || null,
      image_url || null,
      req.params.id
    );
    if (result.changes === 0) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    const row = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(req.params.id);
    res.json(row);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'SKU sudah digunakan' });
    next(err);
  }
});

// PATCH /api/products/:id/stock - Sesuaikan stok
router.patch('/:id/stock', (req, res, next) => {
  try {
    const { delta } = req.body;
    if (delta === undefined) return res.status(400).json({ error: 'Delta stok wajib diisi' });
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    const newStock = product.stock + Number(delta);
    if (newStock < 0) return res.status(400).json({ error: 'Stok tidak boleh negatif' });
    db.prepare('UPDATE products SET stock=?, updated_at=datetime(\'now\',\'localtime\') WHERE id=?')
      .run(newStock, req.params.id);
    res.json({ id: product.id, stock: newStock });
  } catch (err) { next(err); }
});

// DELETE /api/products/:id - Soft delete produk
router.delete('/:id', (req, res, next) => {
  try {
    const result = db.prepare(
      'UPDATE products SET is_active=0, updated_at=datetime(\'now\',\'localtime\') WHERE id=? AND is_active=1'
    ).run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    res.json({ message: 'Produk berhasil dihapus' });
  } catch (err) { next(err); }
});

module.exports = router;
