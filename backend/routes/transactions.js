const express = require('express');
const router  = express.Router();
const pool    = require('../database/db');
const { authenticate, requireAdmin, tenantId } = require('../middleware/authMiddleware');

async function generateInvoiceNumber(client, adminId) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const { rows } = await client.query(
    "SELECT COUNT(*)::int as cnt FROM transactions WHERE invoice_number LIKE $1 AND admin_id = $2",
    [`INV-${date}-%`, adminId]
  );
  const seq = String(rows[0].cnt + 1).padStart(4, '0');
  return `INV-${date}-${seq}`;
}

// GET /api/transactions — hanya transaksi milik tenant
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { from, to, limit = 50, offset = 0 } = req.query;
    const tid    = tenantId(req.user);
    const params = [tid];
    let where = 'AND admin_id = $1';

    if (from) { params.push(from); where += ` AND created_at::date >= $${params.length}`; }
    if (to)   { params.push(to);   where += ` AND created_at::date <= $${params.length}`; }

    params.push(Number(limit));
    params.push(Number(offset));

    const { rows } = await pool.query(
      `SELECT * FROM transactions WHERE 1=1 ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countParams = [tid];
    let countWhere = 'AND admin_id = $1';
    if (from) { countParams.push(from); countWhere += ` AND created_at::date >= $${countParams.length}`; }
    if (to)   { countParams.push(to);   countWhere += ` AND created_at::date <= $${countParams.length}`; }

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int as total FROM transactions WHERE 1=1 ${countWhere}`,
      countParams
    );

    res.json({ data: rows, total: countRows[0].total });
  } catch (err) { next(err); }
});

// GET /api/transactions/summary — ringkasan bulan ini
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const tid = tenantId(req.user);
    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(t.grand_total), 0)::numeric                                               AS pendapatan,
         COALESCE(SUM(t.grand_total) - SUM(ti.quantity * COALESCE(ti.cost_price, 0)), 0)::numeric AS laba_bersih,
         COALESCE(SUM(ti.quantity), 0)::int                                                      AS produk_terjual,
         COUNT(DISTINCT t.id)::int                                                               AS jumlah_transaksi
       FROM transactions t
       JOIN transaction_items ti ON ti.transaction_id = t.id
       WHERE t.admin_id = $1
         AND EXTRACT(YEAR  FROM t.created_at) = EXTRACT(YEAR  FROM NOW())
         AND EXTRACT(MONTH FROM t.created_at) = EXTRACT(MONTH FROM NOW())`,
      [tid]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/transactions/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const tid = tenantId(req.user);
    const { rows: txRows } = await pool.query(
      'SELECT * FROM transactions WHERE id = $1 AND admin_id = $2',
      [req.params.id, tid]
    );
    if (!txRows.length) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

    const { rows: items } = await pool.query(
      'SELECT * FROM transaction_items WHERE transaction_id = $1',
      [req.params.id]
    );
    res.json({ ...txRows[0], items });
  } catch (err) { next(err); }
});

// POST /api/transactions — buat transaksi (atomic)
router.post('/', authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { items, payment_method = 'cash', amount_paid, discount = 0, tax = 0, notes = '' } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Keranjang belanja kosong' });
    }

    const tid = tenantId(req.user);
    if (!tid) return res.status(400).json({ error: 'Tidak dapat menentukan tenant. Pastikan akun terhubung ke admin.' });

    await client.query('BEGIN');

    let subtotal = 0;
    const enrichedItems = [];

    for (const item of items) {
      const { rows: productRows } = await client.query(
        'SELECT * FROM products WHERE id = $1 AND is_active = TRUE AND admin_id = $2',
        [item.product_id, tid]
      );
      if (!productRows.length) {
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
    const changeAmount  = Number(amount_paid) - grandTotal;
    const invoiceNumber = await generateInvoiceNumber(client, tid);

    const { rows: txRows } = await client.query(
      `INSERT INTO transactions
         (admin_id, invoice_number, subtotal, discount, tax, grand_total, amount_paid, change_amount, payment_method, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [tid, invoiceNumber, subtotal, Number(discount), Number(tax), grandTotal, Number(amount_paid), changeAmount, payment_method, notes]
    );
    const transactionId = txRows[0].id;

    const savedItems = [];
    for (const { product, quantity, subtotal: lineSubtotal } of enrichedItems) {
      const { rows: itemRows } = await client.query(
        `INSERT INTO transaction_items
           (transaction_id, product_id, product_name, product_sku, price, cost_price, quantity, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [transactionId, product.id, product.name, product.sku, product.price, product.cost_price || 0, quantity, lineSubtotal]
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

// DELETE /api/transactions/:id — batalkan & kembalikan stok
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tid = tenantId(req.user);

    const { rows: txRows } = await client.query(
      'SELECT * FROM transactions WHERE id = $1 AND admin_id = $2',
      [req.params.id, tid]
    );
    if (!txRows.length) throw Object.assign(new Error('Transaksi tidak ditemukan'), { status: 404 });

    const { rows: items } = await client.query(
      'SELECT * FROM transaction_items WHERE transaction_id = $1',
      [req.params.id]
    );

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
