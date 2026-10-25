const express = require('express')
const router  = express.Router()
const pool    = require('../database/db')
const { postSale } = require('../utils/ledger')
const { verifySignature, extractOrderRef, extractStatus, mapStatus } = require('../utils/dana')

const NOTIFICATION_PATH = '/api/dana/notification'

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

// POST /api/dana/notification — webhook pembayaran DANA (SNAP finish-notify).
// Publik (tanpa auth). Mengembalikan respons SNAP.
router.post('/notification', async (req, res) => {
  try {
    const body    = req.body || {}
    const orderId = extractOrderRef(body)
    if (!orderId) {
      return res.status(200).json({ responseCode: '2005600', responseMessage: 'Successful' })
    }

    // Cari transaksi + pengaturan tenant pemiliknya
    const { rows: txRows } = await pool.query(
      'SELECT id, admin_id FROM transactions WHERE invoice_number = $1', [orderId]
    )
    if (!txRows.length) {
      // Belum ada transaksi cocok → tetap ack agar DANA tidak retry selamanya
      return res.status(200).json({ responseCode: '2005600', responseMessage: 'Successful' })
    }
    const adminId = txRows[0].admin_id
    const { rows: stgRows } = await pool.query(
      'SELECT dana_public_key FROM store_settings WHERE admin_id = $1', [adminId]
    )
    const stg = stgRows[0] || {}

    // Verifikasi tanda tangan HANYA bila public key DANA sudah diisi.
    if (stg.dana_public_key) {
      const ok = verifySignature(stg.dana_public_key, {
        method:    'POST',
        path:      NOTIFICATION_PATH,
        rawBody:   req.rawBody,
        timestamp: req.get('X-TIMESTAMP'),
        signature: req.get('X-SIGNATURE'),
      })
      if (!ok) {
        return res.status(401).json({ responseCode: '4015600', responseMessage: 'Unauthorized. Invalid Signature' })
      }
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
