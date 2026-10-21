const express = require('express')
const router  = express.Router()
const pool    = require('../database/db')
const { authenticate, tenantId } = require('../middleware/authMiddleware')
const { postSale } = require('../utils/ledger')
const { createCheckout, checkStatus, verifyNotification, mapStatus } = require('../utils/doku')
const { sendWhatsApp } = require('../utils/whacenter')

const NOTIFICATION_TARGET = '/api/doku/notification'

async function generateInvoiceNumber(client, adminId) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const { rows } = await client.query(
    "SELECT COUNT(*)::int as cnt FROM transactions WHERE invoice_number LIKE $1 AND admin_id = $2",
    [`INV-${date}-%`, adminId]
  )
  return `INV-${date}-${String(rows[0].cnt + 1).padStart(4, '0')}`
}

function rupiah(n) { return 'Rp' + Math.round(Number(n)).toLocaleString('id-ID') }

// Posting ke Buku Besar saat DOKU lunas (idempoten)
async function settleDoku(adminId, orderId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      'SELECT * FROM transactions WHERE invoice_number = $1 AND admin_id = $2 FOR UPDATE',
      [orderId, adminId]
    )
    if (rows.length) await postSale(client, adminId, rows[0])
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('[DOKU] Gagal posting settlement:', e.message)
  } finally { client.release() }
}

// DOKU gagal/kedaluwarsa → kembalikan stok & hapus transaksi yang belum lunas
async function failDoku(adminId, orderId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      'SELECT * FROM transactions WHERE invoice_number = $1 AND admin_id = $2 FOR UPDATE',
      [orderId, adminId]
    )
    const tx = rows[0]
    if (tx && tx.payment_method === 'doku' && tx.gopay_status !== 'settlement') {
      const posted = await client.query('SELECT 1 FROM journal_entries WHERE transaction_id = $1 LIMIT 1', [tx.id])
      if (posted.rows.length === 0) {
        const { rows: items } = await client.query('SELECT * FROM transaction_items WHERE transaction_id = $1', [tx.id])
        for (const it of items) {
          if (it.product_id) await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [it.quantity, it.product_id])
        }
        await client.query('DELETE FROM transactions WHERE id = $1', [tx.id])
      }
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('[DOKU] Gagal membersihkan transaksi:', e.message)
  } finally { client.release() }
}

// Susun pesan WhatsApp berisi link pembayaran
function buildWaMessage(stg, invoiceNumber, amount, url) {
  const toko = stg.store_name || 'Kasir Online'
  return [
    `*${toko}*`,
    ``,
    `Halo! Berikut tagihan Anda:`,
    `No. Invoice: ${invoiceNumber}`,
    `Total: *${rupiah(amount)}*`,
    ``,
    `Silakan bayar melalui link berikut (e-wallet / Virtual Account):`,
    url,
    ``,
    `Terima kasih 🙏`,
  ].join('\n')
}

// POST /api/doku/charge — buat pembayaran DOKU Checkout (+ opsional kirim WA)
router.post('/charge', authenticate, async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { items, discount = 0, tax = 0, customer_name, customer_phone, send_wa = false } = req.body
    if (!items || items.length === 0) return res.status(400).json({ error: 'Keranjang belanja kosong' })

    const tid = tenantId(req.user)
    const { rows: stgRows } = await pool.query('SELECT * FROM store_settings WHERE admin_id = $1', [tid])
    const stg = stgRows[0] || {}
    if (!stg.doku_client_id || !stg.doku_secret_key) {
      return res.status(400).json({ error: 'DOKU belum dikonfigurasi. Isi Client ID & Secret Key di Pengaturan → DOKU.' })
    }

    await client.query('BEGIN')

    let subtotal = 0
    const enrichedItems = []
    const dokuItems = []
    for (const item of items) {
      const { rows: prodRows } = await client.query(
        'SELECT * FROM products WHERE id = $1 AND is_active = TRUE AND admin_id = $2',
        [item.product_id, tid]
      )
      if (!prodRows.length) throw Object.assign(new Error(`Produk ID ${item.product_id} tidak ditemukan`), { status: 404 })
      const product = prodRows[0]
      if (product.stock < item.quantity) {
        throw Object.assign(new Error(`Stok ${product.name} tidak cukup (tersedia: ${product.stock})`), { status: 400 })
      }
      const lineSub = Math.round(Number(product.price)) * item.quantity
      subtotal += lineSub
      enrichedItems.push({ product, quantity: item.quantity, subtotal: lineSub })
      dokuItems.push({ name: product.name.slice(0, 100), price: Math.round(Number(product.price)), quantity: item.quantity })
    }

    const grandTotal    = Math.round(subtotal - Number(discount) + Number(tax))
    const invoiceNumber = await generateInvoiceNumber(client, tid)
    if (grandTotal !== subtotal) {
      dokuItems.push({ name: grandTotal < subtotal ? 'Diskon' : 'Pajak/Biaya', price: grandTotal - subtotal, quantity: 1 })
    }

    const { rows: txRows } = await client.query(
      `INSERT INTO transactions
         (admin_id, invoice_number, subtotal, discount, tax, grand_total, amount_paid, change_amount, payment_method, gopay_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,0,'doku','pending') RETURNING *`,
      [tid, invoiceNumber, subtotal, Number(discount), Number(tax), grandTotal, grandTotal]
    )
    const tx = txRows[0]

    const savedItems = []
    for (const { product, quantity, subtotal: lineSub } of enrichedItems) {
      const { rows: iRows } = await client.query(
        `INSERT INTO transaction_items (transaction_id, product_id, product_name, product_sku, price, cost_price, quantity, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [tx.id, product.id, product.name, product.sku, product.price, product.cost_price || 0, quantity, lineSub]
      )
      savedItems.push(iRows[0])
      await client.query('UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2', [quantity, product.id])
    }

    // Buat pembayaran DOKU SEBELUM commit — gagal → rollback (stok kembali)
    const checkout = await createCheckout(stg, {
      invoiceNumber,
      amount: grandTotal,
      items: dokuItems,
      customer: { name: customer_name, phone: customer_phone },
    })

    await client.query(
      `UPDATE transactions SET gopay_order_id=$1, gopay_qr_url=$2, gopay_deeplink=$2 WHERE id=$3`,
      [invoiceNumber, checkout.url, tx.id]
    )
    await client.query('COMMIT')

    // Kirim link ke WhatsApp pelanggan (opsional, tidak menggagalkan transaksi)
    let waResult = null
    if (send_wa && customer_phone && stg.whacenter_device_id) {
      try {
        await sendWhatsApp(stg.whacenter_device_id, customer_phone, buildWaMessage(stg, invoiceNumber, grandTotal, checkout.url))
        waResult = { sent: true }
      } catch (e) { waResult = { sent: false, error: e.message } }
    }

    res.status(201).json({
      transaction: { ...tx, items: savedItems },
      doku: { order_id: invoiceNumber, payment_url: checkout.url, gross_amount: grandTotal },
      wa: waResult,
    })
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.status === 400 || err.status === 404) return res.status(err.status).json({ error: err.message })
    next(err)
  } finally { client.release() }
})

// GET /api/doku/status/:order_id — polling status
router.get('/status/:order_id', authenticate, async (req, res, next) => {
  try {
    const tid = tenantId(req.user)
    const { order_id } = req.params
    const { rows: stgRows } = await pool.query('SELECT * FROM store_settings WHERE admin_id = $1', [tid])
    if (!stgRows.length || !stgRows[0].doku_client_id) return res.status(400).json({ error: 'DOKU belum dikonfigurasi' })

    const { status: dokuStatus } = await checkStatus(stgRows[0], order_id)
    const mapped = mapStatus(dokuStatus)
    await pool.query('UPDATE transactions SET gopay_status=$1 WHERE invoice_number=$2 AND admin_id=$3', [mapped, order_id, tid])

    let txData = null
    if (mapped === 'settlement') {
      await settleDoku(tid, order_id)
      const { rows: txRows } = await pool.query('SELECT * FROM transactions WHERE invoice_number=$1 AND admin_id=$2', [order_id, tid])
      if (txRows.length) {
        const { rows: items } = await pool.query('SELECT * FROM transaction_items WHERE transaction_id=$1', [txRows[0].id])
        txData = { ...txRows[0], items }
      }
    } else if (mapped !== 'pending') {
      await failDoku(tid, order_id)
    }

    res.json({ order_id, transaction_status: mapped, doku_status: dokuStatus, transaction: txData })
  } catch (err) { next(err) }
})

// POST /api/doku/cancel/:order_id — batalkan pembayaran pending
router.post('/cancel/:order_id', authenticate, async (req, res, next) => {
  try {
    const tid = tenantId(req.user)
    const { order_id } = req.params
    const { rows: txRows } = await pool.query('SELECT * FROM transactions WHERE invoice_number=$1 AND admin_id=$2', [order_id, tid])
    if (!txRows.length) return res.status(404).json({ error: 'Transaksi tidak ditemukan' })
    if (txRows[0].gopay_status === 'settlement') return res.status(400).json({ error: 'Pembayaran sudah lunas' })
    await failDoku(tid, order_id)
    res.json({ message: 'Pembayaran DOKU dibatalkan dan stok dikembalikan' })
  } catch (err) { next(err) }
})

// POST /api/doku/send-wa — kirim ulang link pembayaran ke WhatsApp pelanggan
router.post('/send-wa', authenticate, async (req, res, next) => {
  try {
    const tid = tenantId(req.user)
    const { order_id, phone } = req.body
    if (!order_id || !phone) return res.status(400).json({ error: 'order_id dan nomor WhatsApp wajib diisi' })

    const { rows: txRows } = await pool.query('SELECT * FROM transactions WHERE invoice_number=$1 AND admin_id=$2', [order_id, tid])
    if (!txRows.length) return res.status(404).json({ error: 'Transaksi tidak ditemukan' })
    const tx = txRows[0]
    const url = tx.gopay_deeplink || tx.gopay_qr_url
    if (!url) return res.status(400).json({ error: 'Link pembayaran tidak ditemukan' })

    const { rows: stgRows } = await pool.query('SELECT * FROM store_settings WHERE admin_id=$1', [tid])
    const stg = stgRows[0] || {}
    await sendWhatsApp(stg.whacenter_device_id, phone, buildWaMessage(stg, order_id, tx.grand_total, url))
    res.json({ message: 'Link pembayaran dikirim ke WhatsApp pelanggan' })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
})

// POST /api/doku/notification — webhook DOKU (tanpa auth)
router.post('/notification', async (req, res, next) => {
  try {
    const body = req.body || {}
    const orderId = body?.order?.invoice_number || body?.transaction?.original_request_id
    if (!orderId) return res.status(200).json({ ok: true })

    const { rows: txRows } = await pool.query('SELECT id, admin_id FROM transactions WHERE invoice_number=$1', [orderId])
    if (!txRows.length) return res.status(200).json({ ok: true })
    const { rows: stgRows } = await pool.query('SELECT * FROM store_settings WHERE admin_id=$1', [txRows[0].admin_id])
    if (!stgRows.length) return res.status(200).json({ ok: true })
    const stg = stgRows[0]

    // Verifikasi tanda tangan (pakai raw body yang ditangkap bodyParser)
    const headers = {
      'client-id': req.get('Client-Id'),
      'request-id': req.get('Request-Id'),
      'request-timestamp': req.get('Request-Timestamp'),
      'signature': req.get('Signature'),
    }
    const valid = verifyNotification(stg, { requestTarget: NOTIFICATION_TARGET, headers, rawBody: req.rawBody })
    if (!valid) return res.status(403).json({ error: 'Invalid signature' })

    const mapped = mapStatus(body?.transaction?.status)
    await pool.query('UPDATE transactions SET gopay_status=$1 WHERE invoice_number=$2', [mapped, orderId])

    if (mapped === 'settlement') await settleDoku(txRows[0].admin_id, orderId)
    else if (mapped !== 'pending') await failDoku(txRows[0].admin_id, orderId)

    res.json({ ok: true })
  } catch (err) { next(err) }
})

module.exports = router
