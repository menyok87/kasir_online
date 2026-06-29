const express = require('express')
const router  = express.Router()
const crypto  = require('crypto')
const midtransClient = require('midtrans-client')
const pool    = require('../database/db')
const { authenticate, tenantId } = require('../middleware/authMiddleware')
const { postSale } = require('../utils/ledger')

// Posting penjualan GoPay ke Buku Besar saat lunas (idempoten — aman dipanggil berkali-kali)
async function postGopaySettlement(adminId, orderId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      'SELECT * FROM transactions WHERE invoice_number = $1 AND admin_id = $2 FOR UPDATE',
      [orderId, adminId]
    )
    if (rows.length) await postSale(client, adminId, rows[0]) // postSale punya guard anti double-post
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('[Ledger] Gagal posting GoPay settlement:', e.message)
  } finally {
    client.release()
  }
}

function getCoreApi(settings) {
  return new midtransClient.CoreApi({
    isProduction: settings.midtrans_is_production || false,
    serverKey:    settings.midtrans_server_key,
    clientKey:    settings.midtrans_client_key,
  })
}

async function generateInvoiceNumber(client, adminId) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const { rows } = await client.query(
    "SELECT COUNT(*)::int as cnt FROM transactions WHERE invoice_number LIKE $1 AND admin_id = $2",
    [`INV-${date}-%`, adminId]
  )
  const seq = String(rows[0].cnt + 1).padStart(4, '0')
  return `INV-${date}-${seq}`
}

// POST /api/gopay/charge — buat tagihan GoPay
router.post('/charge', authenticate, async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { items, discount = 0, tax = 0 } = req.body
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Keranjang belanja kosong' })
    }

    const tid = tenantId(req.user)
    const { rows: stgRows } = await pool.query(
      'SELECT * FROM store_settings WHERE admin_id = $1', [tid]
    )
    if (!stgRows.length || !stgRows[0].midtrans_server_key) {
      return res.status(400).json({ error: 'Midtrans Server Key belum dikonfigurasi. Atur di Pengaturan > GoPay.' })
    }
    const stg = stgRows[0]

    await client.query('BEGIN')

    let subtotal = 0
    const enrichedItems = []
    const midtransItems = []

    for (const item of items) {
      const { rows: prodRows } = await client.query(
        'SELECT * FROM products WHERE id = $1 AND is_active = TRUE AND admin_id = $2',
        [item.product_id, tid]
      )
      if (!prodRows.length) {
        throw Object.assign(new Error(`Produk ID ${item.product_id} tidak ditemukan`), { status: 404 })
      }
      const product = prodRows[0]
      if (product.stock < item.quantity) {
        throw Object.assign(
          new Error(`Stok ${product.name} tidak cukup (tersedia: ${product.stock})`),
          { status: 400 }
        )
      }
      const lineSub = Math.round(Number(product.price)) * item.quantity
      subtotal += lineSub
      enrichedItems.push({ product, quantity: item.quantity, subtotal: lineSub })
      midtransItems.push({
        id:       String(product.id),
        price:    Math.round(Number(product.price)),
        quantity: item.quantity,
        name:     product.name.slice(0, 50),
      })
    }

    const grandTotal    = Math.round(subtotal - Number(discount) + Number(tax))
    const invoiceNumber = await generateInvoiceNumber(client, tid)

    // Simpan transaksi dengan status pending
    const { rows: txRows } = await client.query(
      `INSERT INTO transactions
         (admin_id, invoice_number, subtotal, discount, tax, grand_total,
          amount_paid, change_amount, payment_method, gopay_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,0,'gopay','pending') RETURNING *`,
      [tid, invoiceNumber, subtotal, Number(discount), Number(tax), grandTotal, grandTotal]
    )
    const tx = txRows[0]

    const savedItems = []
    for (const { product, quantity, subtotal: lineSub } of enrichedItems) {
      const { rows: iRows } = await client.query(
        `INSERT INTO transaction_items
           (transaction_id, product_id, product_name, product_sku, price, cost_price, quantity, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [tx.id, product.id, product.name, product.sku, product.price, product.cost_price || 0, quantity, lineSub]
      )
      savedItems.push(iRows[0])
      await client.query(
        'UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2',
        [quantity, product.id]
      )
    }

    await client.query('COMMIT')

    // Buat charge ke Midtrans
    const coreApi = getCoreApi(stg)
    const chargeResp = await coreApi.charge({
      payment_type: 'gopay',
      transaction_details: {
        order_id:     invoiceNumber,
        gross_amount: grandTotal,
      },
      item_details: midtransItems,
      gopay: { enable_callback: false },
    })

    const qrAction       = chargeResp.actions?.find(a => a.name === 'generate-qr-code')
    const deeplinkAction = chargeResp.actions?.find(a => a.name === 'deeplink-redirect')
    const qrUrl          = qrAction?.url || null
    const deeplink       = deeplinkAction?.url || null

    await pool.query(
      `UPDATE transactions SET gopay_order_id=$1, gopay_qr_url=$2, gopay_deeplink=$3 WHERE id=$4`,
      [invoiceNumber, qrUrl, deeplink, tx.id]
    )

    res.status(201).json({
      transaction: { ...tx, items: savedItems },
      gopay: {
        order_id: invoiceNumber,
        qr_url:   qrUrl,
        deeplink,
        gross_amount: grandTotal,
      },
    })
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
})

// GET /api/gopay/status/:order_id — polling status pembayaran
router.get('/status/:order_id', authenticate, async (req, res, next) => {
  try {
    const tid = tenantId(req.user)
    const { order_id } = req.params

    const { rows: stgRows } = await pool.query(
      'SELECT * FROM store_settings WHERE admin_id = $1', [tid]
    )
    if (!stgRows.length || !stgRows[0].midtrans_server_key) {
      return res.status(400).json({ error: 'Midtrans belum dikonfigurasi' })
    }

    const coreApi    = getCoreApi(stgRows[0])
    const statusResp = await coreApi.transaction.status(order_id)
    const txStatus   = statusResp.transaction_status

    await pool.query(
      `UPDATE transactions SET gopay_status=$1 WHERE invoice_number=$2 AND admin_id=$3`,
      [txStatus, order_id, tid]
    )

    // Ambil data transaksi lengkap jika sudah settlement
    let txData = null
    if (txStatus === 'settlement' || txStatus === 'capture') {
      await postGopaySettlement(tid, order_id) // posting ke Buku Besar
      const { rows: txRows } = await pool.query(
        'SELECT * FROM transactions WHERE invoice_number=$1 AND admin_id=$2', [order_id, tid]
      )
      if (txRows.length) {
        const { rows: items } = await pool.query(
          'SELECT * FROM transaction_items WHERE transaction_id=$1', [txRows[0].id]
        )
        txData = { ...txRows[0], items }
      }
    }

    res.json({ order_id, transaction_status: txStatus, transaction: txData })
  } catch (err) {
    next(err)
  }
})

// POST /api/gopay/cancel/:order_id — batalkan tagihan pending
router.post('/cancel/:order_id', authenticate, async (req, res, next) => {
  const client = await pool.connect()
  try {
    const tid      = tenantId(req.user)
    const { order_id } = req.params

    const { rows: txRows } = await client.query(
      'SELECT * FROM transactions WHERE invoice_number=$1 AND admin_id=$2',
      [order_id, tid]
    )
    if (!txRows.length) return res.status(404).json({ error: 'Transaksi tidak ditemukan' })
    const tx = txRows[0]

    if (tx.gopay_status !== 'pending') {
      return res.status(400).json({ error: 'Hanya transaksi pending yang bisa dibatalkan' })
    }

    const { rows: stgRows } = await pool.query('SELECT * FROM store_settings WHERE admin_id=$1', [tid])
    if (stgRows.length && stgRows[0].midtrans_server_key) {
      try {
        const coreApi = getCoreApi(stgRows[0])
        await coreApi.transaction.cancel(order_id)
      } catch (_) {}
    }

    await client.query('BEGIN')
    const { rows: items } = await client.query(
      'SELECT * FROM transaction_items WHERE transaction_id=$1', [tx.id]
    )
    for (const item of items) {
      if (item.product_id) {
        await client.query(
          'UPDATE products SET stock=stock+$1 WHERE id=$2', [item.quantity, item.product_id]
        )
      }
    }
    await client.query('DELETE FROM transactions WHERE id=$1', [tx.id])
    await client.query('COMMIT')

    res.json({ message: 'Tagihan GoPay dibatalkan dan stok dikembalikan' })
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
})

// POST /api/gopay/notification — webhook dari Midtrans (tanpa auth)
router.post('/notification', async (req, res, next) => {
  try {
    const { order_id, transaction_status, fraud_status, gross_amount, signature_key, status_code } = req.body
    if (!order_id) return res.status(200).json({ ok: true })

    const { rows: txRows } = await pool.query(
      'SELECT t.id, t.admin_id FROM transactions t WHERE t.invoice_number=$1', [order_id]
    )
    if (!txRows.length) return res.status(200).json({ ok: true })

    const { rows: stgRows } = await pool.query(
      'SELECT midtrans_server_key FROM store_settings WHERE admin_id=$1', [txRows[0].admin_id]
    )
    if (!stgRows.length) return res.status(200).json({ ok: true })

    const serverKey = stgRows[0].midtrans_server_key
    const expected  = crypto.createHash('sha512')
      .update(order_id + status_code + gross_amount + serverKey)
      .digest('hex')

    if (signature_key !== expected) {
      return res.status(403).json({ error: 'Invalid signature' })
    }

    const finalStatus =
      (transaction_status === 'capture' && fraud_status === 'accept') ||
      transaction_status === 'settlement'
        ? 'settlement'
        : transaction_status

    await pool.query(
      'UPDATE transactions SET gopay_status=$1 WHERE invoice_number=$2',
      [finalStatus, order_id]
    )

    // Posting ke Buku Besar saat pembayaran lunas
    if (finalStatus === 'settlement') {
      await postGopaySettlement(txRows[0].admin_id, order_id)
    }

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

module.exports = router
