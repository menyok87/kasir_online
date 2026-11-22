const express = require('express');
const router  = express.Router();
const pool    = require('../database/db');
const { authenticate, requireAdmin, tenantId } = require('../middleware/authMiddleware');

const PRODUCT_SELECT = `
  SELECT p.*, c.name as category_name
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
`;

// GET /api/products — hanya produk milik tenant
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { category_id, search } = req.query;
    const tid = tenantId(req.user);
    const params = [tid];
    let where = 'WHERE p.is_active = TRUE AND p.admin_id = $1';

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

// GET /api/products/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const tid = tenantId(req.user);
    const { rows } = await pool.query(
      `${PRODUCT_SELECT} WHERE p.id = $1 AND p.admin_id = $2`,
      [req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/products
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, category_id, price, cost_price = 0, stock, sku, image_url } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nama produk wajib diisi' });
    if (price === undefined || price < 0) return res.status(400).json({ error: 'Harga tidak valid' });

    const tid = tenantId(req.user);
    const { rows: inserted } = await pool.query(
      `INSERT INTO products (name, category_id, price, cost_price, stock, sku, image_url, admin_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [name.trim(), category_id || null, Number(price), Number(cost_price) || 0, Number(stock) || 0, sku || null, image_url || null, tid]
    );

    const { rows } = await pool.query(`${PRODUCT_SELECT} WHERE p.id = $1`, [inserted[0].id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'SKU sudah digunakan' });
    next(err);
  }
});

// PUT /api/products/:id
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, category_id, price, cost_price = 0, stock, sku, image_url } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nama produk wajib diisi' });
    if (price === undefined || price < 0) return res.status(400).json({ error: 'Harga tidak valid' });

    const tid = tenantId(req.user);
    const { rows: updated } = await pool.query(
      `UPDATE products
       SET name=$1, category_id=$2, price=$3, cost_price=$4, stock=$5, sku=$6, image_url=$7, updated_at=NOW()
       WHERE id=$8 AND is_active=TRUE AND admin_id=$9 RETURNING id`,
      [name.trim(), category_id || null, Number(price), Number(cost_price) || 0, Number(stock) || 0, sku || null, image_url || null, req.params.id, tid]
    );
    if (!updated.length) return res.status(404).json({ error: 'Produk tidak ditemukan' });

    const { rows } = await pool.query(`${PRODUCT_SELECT} WHERE p.id = $1`, [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'SKU sudah digunakan' });
    next(err);
  }
});

// PATCH /api/products/:id/stock — internal (dipanggil dari transactions)
router.patch('/:id/stock', authenticate, async (req, res, next) => {
  try {
    const { delta } = req.body;
    if (delta === undefined) return res.status(400).json({ error: 'Delta stok wajib diisi' });

    const tid = tenantId(req.user);
    const { rows: productRows } = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND is_active = TRUE AND admin_id = $2',
      [req.params.id, tid]
    );
    if (!productRows.length) return res.status(404).json({ error: 'Produk tidak ditemukan' });

    const newStock = productRows[0].stock + Number(delta);
    if (newStock < 0) return res.status(400).json({ error: 'Stok tidak boleh negatif' });

    await pool.query('UPDATE products SET stock=$1, updated_at=NOW() WHERE id=$2', [newStock, req.params.id]);
    res.json({ id: productRows[0].id, stock: newStock });
  } catch (err) { next(err); }
});

// DELETE /api/products/:id — soft delete
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const tid = tenantId(req.user);
    const { rows } = await pool.query(
      'UPDATE products SET is_active=FALSE, updated_at=NOW() WHERE id=$1 AND is_active=TRUE AND admin_id=$2 RETURNING id',
      [req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    res.json({ message: 'Produk berhasil dihapus' });
  } catch (err) { next(err); }
});

module.exports = router;
