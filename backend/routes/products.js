const express = require('express');
const router = express.Router();
const pool = require('../database/db');

const PRODUCT_SELECT = `
  SELECT p.*, c.name as category_name
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
`;

// GET /api/products - Daftar produk aktif
router.get('/', async (req, res, next) => {
  try {
    const { category_id, search } = req.query;
    const params = [];
    let where = 'WHERE p.is_active = TRUE';

    if (category_id) {
      params.push(category_id);
      where += ` AND p.category_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND p.name ILIKE $${params.length}`;
    }

    const { rows } = await pool.query(`${PRODUCT_SELECT} ${where} ORDER BY p.name`, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/products/:id - Detail produk
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `${PRODUCT_SELECT} WHERE p.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/products - Buat produk baru
router.post('/', async (req, res, next) => {
  try {
    const { name, category_id, price, stock, sku, image_url } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Nama produk wajib diisi' });
    if (price === undefined || price < 0) return res.status(400).json({ error: 'Harga tidak valid' });

    const { rows: inserted } = await pool.query(
      `INSERT INTO products (name, category_id, price, stock, sku, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [name.trim(), category_id || null, Number(price), Number(stock) || 0, sku || null, image_url || null]
    );

    const { rows } = await pool.query(
      `${PRODUCT_SELECT} WHERE p.id = $1`,
      [inserted[0].id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'SKU sudah digunakan' });
    next(err);
  }
});

// PUT /api/products/:id - Update produk
router.put('/:id', async (req, res, next) => {
  try {
    const { name, category_id, price, stock, sku, image_url } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Nama produk wajib diisi' });
    if (price === undefined || price < 0) return res.status(400).json({ error: 'Harga tidak valid' });

    const { rows: updated } = await pool.query(
      `UPDATE products
       SET name=$1, category_id=$2, price=$3, stock=$4, sku=$5, image_url=$6, updated_at=NOW()
       WHERE id=$7 AND is_active=TRUE
       RETURNING id`,
      [name.trim(), category_id || null, Number(price), Number(stock) || 0, sku || null, image_url || null, req.params.id]
    );
    if (updated.length === 0) return res.status(404).json({ error: 'Produk tidak ditemukan' });

    const { rows } = await pool.query(`${PRODUCT_SELECT} WHERE p.id = $1`, [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'SKU sudah digunakan' });
    next(err);
  }
});

// PATCH /api/products/:id/stock - Sesuaikan stok
router.patch('/:id/stock', async (req, res, next) => {
  try {
    const { delta } = req.body;
    if (delta === undefined) return res.status(400).json({ error: 'Delta stok wajib diisi' });

    const { rows: productRows } = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND is_active = TRUE',
      [req.params.id]
    );
    if (productRows.length === 0) return res.status(404).json({ error: 'Produk tidak ditemukan' });

    const newStock = productRows[0].stock + Number(delta);
    if (newStock < 0) return res.status(400).json({ error: 'Stok tidak boleh negatif' });

    await pool.query(
      'UPDATE products SET stock=$1, updated_at=NOW() WHERE id=$2',
      [newStock, req.params.id]
    );
    res.json({ id: productRows[0].id, stock: newStock });
  } catch (err) { next(err); }
});

// DELETE /api/products/:id - Soft delete produk
router.delete('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'UPDATE products SET is_active=FALSE, updated_at=NOW() WHERE id=$1 AND is_active=TRUE RETURNING id',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    res.json({ message: 'Produk berhasil dihapus' });
  } catch (err) { next(err); }
});

module.exports = router;
