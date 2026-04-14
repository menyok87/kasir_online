const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const { requireAdmin } = require('../middleware/authMiddleware');

async function generateInvoiceNumber(client) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const { rows } = await client.query(
    "SELECT COUNT(*)::int as cnt FROM transactions WHERE invoice_number LIKE $1",
    [`INV-${date}-%`]
  );
  const seq = String(rows[0].cnt + 1).padStart(4, '0');
  return `INV-${date}-${seq}`;
}

// GET /api/transactions - Daftar transaksi
router.get('/', async (req, res, next) => {
  try {
    const { from, to, limit = 50, offset = 0 } = req.query;
    const params = [];
    let where = '';

    if (from) { params.push(from); where += ` AND created_at::date >= $${params.length}`; }
    if (to)   { params.push(to);   where += ` AND created_at::date <= $${params.length}`; }

    params.push(Number(limit));
    params.push(Number(offset));

    const { rows } = await pool.query(
      `SELECT * FROM transactions WHERE 1=1${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countParams = [];
    let countWhere = '';
    if (from) { countParams.push(from); countWhere += ` AND created_at::date >= $${countParams.length}`; }
    if (to)   { countParams.push(to);   countWhere += ` AND created_at::date <= $${countParams.length}`; }

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int as total FROM transactions WHERE 1=1${countWhere}`,
      countParams
    );

    res.json({ data: rows, total: countRows[0].total });
  } catch (err) { next(err); }
});

// GET /api/transactions/:id - Detail transaksi beserta item
router.get('/:id', async (req, res, next) => {
  try {
    const { rows: txRows } = await pool.query('SELECT * FROM transactions WHERE id = $1', [req.params.id]);
    if (txRows.length === 0) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

    const { rows: items } = await pool.query(
      'SELECT * FROM transaction_items WHERE transaction_id = $1',
      [req.params.id]
    );
    res.json({ ...txRows[0], items });
  } catch (err) { next(err); }
});

// POST /api/transactions - Buat transaksi baru (atomic)
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { items, payment_method = 'cash', amount_paid, discount = 0, tax = 0, notes = '' } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Keranjang belanja kosong' });
    }

    await client.query('BEGIN');

    // Validasi produk & hitung total
    let subtotal = 0;
    const enrichedItems = [];

    for (const item of items) {
      const { rows: productRows } = await client.query(
        'SELECT * FROM products WHERE id = $1 AND is_active = TRUE',
        [item.product_id]
      );
      if (productRows.length === 0) {
        throw Object.assign(new Error(`Produk ID ${item.product_id} tidak ditemukan`), { status: 404 });
      }
      const product = productRows[0];
      if (product.stock < item.quantity) {
        throw Object.assign(
          new Error(`Stok ${product.name} tidak cukup (tersedia: ${product.stock})`),
          { status: 400 }
        );
      }
      const lineSubtotal = Number(product.price) * item.quantity;
      subtotal += lineSubtotal;
      enrichedItems.push({ product, quantity: item.quantity, subtotal: lineSubtotal });
    }

    const grandTotal = subtotal - Number(discount) + Number(tax);
    if (Number(amount_paid) < grandTotal) {
      throw Object.assign(new Error('Pembayaran kurang dari total belanja'), { status: 400 });
    }
    const changeAmount = Number(amount_paid) - grandTotal;
    const invoiceNumber = await generateInvoiceNumber(client);

    // Insert transaksi
    const { rows: txRows } = await client.query(
      `INSERT INTO transactions
         (invoice_number, subtotal, discount, tax, grand_total, amount_paid, change_amount, payment_method, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [invoiceNumber, subtotal, Number(discount), Number(tax), grandTotal, Number(amount_paid), changeAmount, payment_method, notes]
    );
    const transactionId = txRows[0].id;

    // Insert items & kurangi stok
    const savedItems = [];
    for (const { product, quantity, subtotal: lineSubtotal } of enrichedItems) {
      const { rows: itemRows } = await client.query(
        `INSERT INTO transaction_items
           (transaction_id, product_id, product_name, product_sku, price, quantity, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [transactionId, product.id, product.name, product.sku, product.price, quantity, lineSubtotal]
      );
      savedItems.push(itemRows[0]);

      await client.query(
        'UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2',
        [quantity, product.id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ ...txRows[0], items: savedItems });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// DELETE /api/transactions/:id - Batalkan transaksi & kembalikan stok (admin only)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: txRows } = await client.query(
      'SELECT * FROM transactions WHERE id = $1',
      [req.params.id]
    );
    if (txRows.length === 0) throw Object.assign(new Error('Transaksi tidak ditemukan'), { status: 404 });

    const { rows: items } = await client.query(
      'SELECT * FROM transaction_items WHERE transaction_id = $1',
      [req.params.id]
    );

    // Kembalikan stok
    for (const item of items) {
      if (item.product_id) {
        await client.query(
          'UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
    }

    await client.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ message: 'Transaksi berhasil dibatalkan dan stok dikembalikan' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
