const express = require('express');
const router = express.Router();
const db = require('../database/db');

function generateInvoiceNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const row = db.prepare(
    "SELECT COUNT(*) as cnt FROM transactions WHERE invoice_number LIKE ?"
  ).get(`INV-${date}-%`);
  const seq = String(row.cnt + 1).padStart(4, '0');
  return `INV-${date}-${seq}`;
}

// GET /api/transactions - Daftar transaksi
router.get('/', (req, res, next) => {
  try {
    const { from, to, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM transactions WHERE 1=1';
    const params = [];
    if (from) { query += ' AND date(created_at) >= ?'; params.push(from); }
    if (to)   { query += ' AND date(created_at) <= ?'; params.push(to); }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    const rows = db.prepare(query).all(...params);

    // Total count untuk pagination
    let countQuery = 'SELECT COUNT(*) as total FROM transactions WHERE 1=1';
    const countParams = [];
    if (from) { countQuery += ' AND date(created_at) >= ?'; countParams.push(from); }
    if (to)   { countQuery += ' AND date(created_at) <= ?'; countParams.push(to); }
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({ data: rows, total });
  } catch (err) { next(err); }
});

// GET /api/transactions/:id - Detail transaksi beserta item
router.get('/:id', (req, res, next) => {
  try {
    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
    if (!transaction) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    const items = db.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?').all(req.params.id);
    res.json({ ...transaction, items });
  } catch (err) { next(err); }
});

// POST /api/transactions - Buat transaksi baru (atomic)
router.post('/', (req, res, next) => {
  try {
    const { items, payment_method = 'cash', amount_paid, discount = 0, tax = 0, notes = '' } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Keranjang belanja kosong' });
    }

    const createTransaction = db.transaction(() => {
      // Validasi produk & hitung total
      let subtotal = 0;
      const enrichedItems = items.map(item => {
        const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(item.product_id);
        if (!product) throw Object.assign(new Error(`Produk ID ${item.product_id} tidak ditemukan`), { status: 404 });
        if (product.stock < item.quantity) {
          throw Object.assign(
            new Error(`Stok ${product.name} tidak cukup (tersedia: ${product.stock})`),
            { status: 400 }
          );
        }
        const lineSubtotal = product.price * item.quantity;
        subtotal += lineSubtotal;
        return { product, quantity: item.quantity, subtotal: lineSubtotal };
      });

      const grandTotal = subtotal - Number(discount) + Number(tax);
      if (Number(amount_paid) < grandTotal) {
        throw Object.assign(new Error('Pembayaran kurang dari total belanja'), { status: 400 });
      }
      const changeAmount = Number(amount_paid) - grandTotal;
      const invoiceNumber = generateInvoiceNumber();

      // Insert transaksi
      const txResult = db.prepare(`
        INSERT INTO transactions (invoice_number, subtotal, discount, tax, grand_total, amount_paid, change_amount, payment_method, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(invoiceNumber, subtotal, Number(discount), Number(tax), grandTotal, Number(amount_paid), changeAmount, payment_method, notes);

      const transactionId = txResult.lastInsertRowid;

      // Insert items & kurangi stok
      const insertItem = db.prepare(`
        INSERT INTO transaction_items (transaction_id, product_id, product_name, product_sku, price, quantity, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const decrementStock = db.prepare(
        "UPDATE products SET stock = stock - ?, updated_at = datetime('now','localtime') WHERE id = ?"
      );

      for (const { product, quantity, subtotal: lineSubtotal } of enrichedItems) {
        insertItem.run(transactionId, product.id, product.name, product.sku, product.price, quantity, lineSubtotal);
        decrementStock.run(quantity, product.id);
      }

      const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId);
      const savedItems = db.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?').all(transactionId);
      return { ...transaction, items: savedItems };
    });

    const result = createTransaction();
    res.status(201).json(result);
  } catch (err) { next(err); }
});

// DELETE /api/transactions/:id - Batalkan transaksi & kembalikan stok
router.delete('/:id', (req, res, next) => {
  try {
    const voidTransaction = db.transaction(() => {
      const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
      if (!transaction) throw Object.assign(new Error('Transaksi tidak ditemukan'), { status: 404 });

      const items = db.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?').all(req.params.id);

      // Kembalikan stok
      const restoreStock = db.prepare(
        "UPDATE products SET stock = stock + ?, updated_at = datetime('now','localtime') WHERE id = ? AND id IS NOT NULL"
      );
      for (const item of items) {
        if (item.product_id) restoreStock.run(item.quantity, item.product_id);
      }

      db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
    });

    voidTransaction();
    res.json({ message: 'Transaksi berhasil dibatalkan dan stok dikembalikan' });
  } catch (err) { next(err); }
});

module.exports = router;
