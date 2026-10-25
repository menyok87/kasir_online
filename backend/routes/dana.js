const express = require('express')
const router  = express.Router()
const pool    = require('../database/db')
const { authenticate, tenantId } = require('../middleware/authMiddleware')
const { postSale } = require('../utils/ledger')
const { createCheckout, queryStatus, verifySignature, extractOrderRef, extractStatus, mapStatus } = require('../utils/dana')
const { sendWhatsApp } = require('../utils/whacenter')

const NOTIFICATION_PATH = '/api/dana/notification'

async function generateInvoiceNumber(client, adminId) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const { rows } = await client.query(
    "SELECT COUNT(*)::int as cnt FROM transactions WHERE invoice_number LIKE $1 AND admin_id = $2",
    [`INV-${date}-%`, adminId]
  )
  return `INV-${date}-${String(rows[0].cnt + 1).padStart(4, '0')}`
}

function rupiah(n) { return 'Rp' + Math.round(Number(n)).toLocaleString('id-ID') }

function buildWaMessage(stg, invoiceNumber, amount, url) {
  const toko = stg.store_name || 'Kasir Online'
  return [
    `*${toko}*`, ``,
    `Halo! Berikut tagihan Anda:`,
    `No. Invoice: ${invoiceNumber}`,
    `Total: *${rupiah(amount)}*`, ``,
    `Silakan bayar lewat DANA / QRIS pada link berikut:`,
    url, ``,
    `Terima kasih 🙏`,
  ].join('\n')
}

// Posting ke Buku Besar saat DANA lunas (idempoten)
async function settleDana(adminId, orderId) {
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
    console.error('[DANA] Gagal posting settlement:', e.message)
  } finally { client.release() }
}

// DANA gagal/kedaluwarsa → kembalikan stok & hapus transaksi yang belum lunas
async function failDana(adminId, orderId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      'SELECT * FROM transactions WHERE invoice_number = $1 AND admin_id = $2 FOR UPDATE',
      [orderId, adminId]
    )
    const tx = rows[0]
    if (tx && tx.payment_method === 'dana' && tx.gopay_status !== 'settlement') {
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
    console.error('[DANA] Gagal membersihkan transaksi:', e.message)
  } finally { client.release() }
}

// POST /api/dana/charge — buat order DANA (Hosted Checkout) + opsional kirim WA
router.post('/charge', authenticate, async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { items, discount = 0, tax = 0, customer_name, customer_phone, send_wa = false } = req.body
    if (!items || items.length === 0) return res.status(400).json({ error: 'Keranjang belanja kosong' })

    const tid = tenantId(req.user)
    const { rows: stgRows } = await pool.query('SELECT * FROM store_settings WHERE admin_id = $1', [tid])
    const stg = stgRows[0] || {}
    if (!stg.dana_private_key || !(stg.dana_client_id || stg.dana_partner_id) || !stg.dana_merchant_id) {
      return res.status(400).json({ error: 'DANA belum lengkap. Isi Client ID, Merchant ID & Private Key di Pengaturan → DANA.' })
    }

    await client.query('BEGIN')

    let subtotal = 0
    const enrichedItems = []
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
    }

    const grandTotal    = Math.round(subtotal - Number(discount) + Number(tax))
    const invoiceNumber = await generateInvoiceNumber(client, tid)

    const { rows: txRows } = await client.query(
      `INSERT INTO transactions
         (admin_id, invoice_number, subtotal, discount, tax, grand_total, amount_paid, change_amount, payment_method, gopay_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,0,'dana','pending') RETURNING *`,
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

    // URL notifikasi & return → endpoint webhook kita
    const origin    = process.env.PUBLIC_BASE_URL || (`${req.protocol}://${req.get('host')}`)
    const notifyUrl = origin + NOTIFICATION_PATH

    // Buat order DANA SEBELUM commit — gagal → rollback (stok kembali)
    const checkout = await createCheckout(stg, {
      invoiceNumber, amount: grandTotal, returnUrl: notifyUrl, notifyUrl,
    })

    await client.query(
      `UPDATE transactions SET gopay_order_id=$1, gopay_qr_url=$2, gopay_deeplink=$2 WHERE id=$3`,
      [invoiceNumber, checkout.url, tx.id]
    )
    await client.query('COMMIT')

    let waResult = null
    if (send_wa && customer_phone && stg.whacenter_device_id) {
      try {
        await sendWhatsApp(stg.whacenter_device_id, customer_phone, buildWaMessage(stg, invoiceNumber, grandTotal, checkout.url))
        waResult = { sent: true }
      } catch (e) { waResult = { sent: false, error: e.message } }
    }

    res.status(201).json({
      transaction: { ...tx, items: savedItems },
      dana: { order_id: invoiceNumber, payment_url: checkout.url, gross_amount: grandTotal },
      wa: waResult,
    })
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.status === 400 || err.status === 404) return res.status(err.status).json({ error: err.message })
    next(err)
  } finally { client.release() }
})

// GET /api/dana/status/:order_id — cek status ke DANA
router.get('/status/:order_id', authenticate, async (req, res, next) => {
  try {
    const tid = tenantId(req.user)
    const { order_id } = req.params
    const { rows: stgRows } = await pool.query('SELECT * FROM store_settings WHERE admin_id = $1', [tid])
    if (!stgRows.length || !stgRows[0].dana_private_key) return res.status(400).json({ error: 'DANA belum dikonfigurasi' })

    const { status } = await queryStatus(stgRows[0], order_id)
    const mapped = mapStatus(status)
    await pool.query('UPDATE transactions SET gopay_status=$1 WHERE invoice_number=$2 AND admin_id=$3', [mapped, order_id, tid])

    let txData = null
    if (mapped === 'settlement') {
      await settleDana(tid, order_id)
      const { rows: txRows } = await pool.query('SELECT * FROM transactions WHERE invoice_number=$1 AND admin_id=$2', [order_id, tid])
      if (txRows.length) {
        const { rows: its } = await pool.query('SELECT * FROM transaction_items WHERE transaction_id=$1', [txRows[0].id])
        txData = { ...txRows[0], items: its }
      }
    } else if (mapped !== 'pending') {
      await failDana(tid, order_id)
    }
    res.json({ order_id, transaction_status: mapped, dana_status: status, transaction: txData })
  } catch (err) { next(err) }
})

// POST /api/dana/cancel/:order_id
router.post('/cancel/:order_id', authenticate, async (req, res, next) => {
  try {
    const tid = tenantId(req.user)
    const { order_id } = req.params
    const { rows: txRows } = await pool.query('SELECT * FROM transactions WHERE invoice_number=$1 AND admin_id=$2', [order_id, tid])
    if (!txRows.length) return res.status(404).json({ error: 'Transaksi tidak ditemukan' })
    if (txRows[0].gopay_status === 'settlement') return res.status(400).json({ error: 'Pembayaran sudah lunas' })
    await failDana(tid, order_id)
    res.json({ message: 'Pembayaran DANA dibatalkan dan stok dikembalikan' })
  } catch (err) { next(err) }
})

// POST /api/dana/send-wa — kirim ulang link ke WhatsApp pelanggan
router.post('/send-wa', authenticate, async (req, res, next) => {
  try {
    const tid = tenantId(req.user)
    const { order_id, phone } = req.body
    if (!order_id || !phone) return res.status(400).json({ error: 'order_id dan nomor WhatsApp wajib diisi' })
    const { rows: txRows } = await pool.query('SELECT * FROM transactions WHERE invoice_number=$1 AND admin_id=$2', [order_id, tid])
    if (!txRows.length) return res.status(404).json({ error: 'Transaksi tidak ditemukan' })
    const tx  = txRows[0]
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

// POST /api/dana/notification — webhook pembayaran DANA (SNAP finish-notify). Publik.
router.post('/notification', async (req, res) => {
  try {
    const body    = req.body || {}
    const orderId = extractOrderRef(body)
    if (!orderId) return res.status(200).json({ responseCode: '2005600', responseMessage: 'Successful' })

    const { rows: txRows } = await pool.query('SELECT id, admin_id FROM transactions WHERE invoice_number = $1', [orderId])
    if (!txRows.length) return res.status(200).json({ responseCode: '2005600', responseMessage: 'Successful' })
    const adminId = txRows[0].admin_id
    const { rows: stgRows } = await pool.query('SELECT dana_public_key FROM store_settings WHERE admin_id = $1', [adminId])
    const stg = stgRows[0] || {}

    if (stg.dana_public_key) {
      const ok = verifySignature(stg.dana_public_key, {
        method: 'POST', path: NOTIFICATION_PATH, rawBody: req.rawBody,
        timestamp: req.get('X-TIMESTAMP'), signature: req.get('X-SIGNATURE'),
      })
      if (!ok) return res.status(401).json({ responseCode: '4015600', responseMessage: 'Unauthorized. Invalid Signature' })
    }

    const mapped = mapStatus(extractStatus(body))
    await pool.query('UPDATE transactions SET gopay_status = $1 WHERE invoice_number = $2', [mapped, orderId])
    if (mapped === 'settlement') await settleDana(adminId, orderId)
    else if (mapped !== 'pending') await failDana(adminId, orderId)

    res.status(200).json({ responseCode: '2005600', responseMessage: 'Successful' })
  } catch (err) {
    console.error('[DANA] Webhook error:', err.message)
    res.status(500).json({ responseCode: '5005600', responseMessage: 'General Error' })
  }
})

module.exports = router
