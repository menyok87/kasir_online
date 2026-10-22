// Integrasi DOKU Checkout (hosted payment page) — mencakup e-wallet & semua
// Virtual Account dalam satu link pembayaran. Menandatangani request sesuai
// spesifikasi DOKU Jokul (HMAC-SHA256).
//
// Dokumentasi: https://docs.doku.com/
const crypto = require('crypto')

function baseUrl(settings) {
  return settings.doku_is_production ? 'https://api.doku.com' : 'https://api-sandbox.doku.com'
}

// Timestamp UTC ISO8601 tanpa milidetik: 2021-01-01T00:00:00Z
function nowTimestamp() {
  return new Date().toISOString().split('.')[0] + 'Z'
}

// Bangun header Signature DOKU.
// bodyString = string JSON mentah yang dikirim (kosong untuk GET → tanpa Digest).
function buildSignature({ clientId, secretKey, requestId, timestamp, requestTarget, bodyString }) {
  const lines = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${requestTarget}`,
  ]
  if (bodyString) {
    const digest = crypto.createHash('sha256').update(bodyString, 'utf8').digest('base64')
    lines.push(`Digest:${digest}`)
  }
  const raw = lines.join('\n')
  const sig = crypto.createHmac('sha256', secretKey).update(raw, 'utf8').digest('base64')
  return 'HMACSHA256=' + sig
}

function assertConfigured(settings) {
  if (!settings.doku_client_id || !settings.doku_secret_key) {
    throw Object.assign(new Error('DOKU belum dikonfigurasi. Isi Client ID & Secret Key di Pengaturan → DOKU.'), { status: 400 })
  }
}

// Buat pembayaran Checkout. Mengembalikan { url, token_id, raw }.
async function createCheckout(settings, { invoiceNumber, amount, items = [], customer = {}, callbackUrl }) {
  assertConfigured(settings)
  const requestTarget = '/checkout/v1/payment'
  const requestId     = crypto.randomUUID()
  const timestamp     = nowTimestamp()

  const body = {
    order: {
      amount: Math.round(Number(amount)),
      invoice_number: invoiceNumber,
      currency: 'IDR',
      line_items: items.map(it => ({
        name: String(it.name).slice(0, 255),
        price: Math.round(Number(it.price)),
        quantity: Number(it.quantity),
      })),
    },
    payment: { payment_due_date: 60 },   // menit
    customer: {
      name:  customer.name  || 'Pelanggan',
      email: customer.email || undefined,
      phone: customer.phone || undefined,
    },
  }
  if (callbackUrl) body.order.callback_url = callbackUrl
  const bodyString = JSON.stringify(body)

  const signature = buildSignature({
    clientId: settings.doku_client_id, secretKey: settings.doku_secret_key,
    requestId, timestamp, requestTarget, bodyString,
  })

  const resp = await fetch(baseUrl(settings) + requestTarget, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Id': settings.doku_client_id,
      'Request-Id': requestId,
      'Request-Timestamp': timestamp,
      'Signature': signature,
    },
    body: bodyString,
  })

  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    const msg = data?.error?.message || data?.message || `DOKU gagal (HTTP ${resp.status})`
    throw Object.assign(new Error(Array.isArray(msg) ? msg.join(', ') : msg), { status: 400 })
  }
  const payment = data?.response?.payment || {}
  if (!payment.url) throw Object.assign(new Error('DOKU tidak mengembalikan URL pembayaran.'), { status: 400 })
  return { url: payment.url, token_id: payment.token_id || null, raw: data }
}

// Cek status pembayaran. Mengembalikan { status, raw }.
// status DOKU: PENDING | SUCCESS | FAILED | EXPIRED | REFUNDED | ...
async function checkStatus(settings, invoiceNumber) {
  assertConfigured(settings)
  const requestTarget = `/orders/v1/status/${invoiceNumber}`
  const requestId     = crypto.randomUUID()
  const timestamp     = nowTimestamp()

  const signature = buildSignature({
    clientId: settings.doku_client_id, secretKey: settings.doku_secret_key,
    requestId, timestamp, requestTarget,   // GET → tanpa body/Digest
  })

  const resp = await fetch(baseUrl(settings) + requestTarget, {
    headers: {
      'Client-Id': settings.doku_client_id,
      'Request-Id': requestId,
      'Request-Timestamp': timestamp,
      'Signature': signature,
    },
  })
  const data = await resp.json().catch(() => ({}))
  const status = data?.transaction?.status || data?.order?.status || null
  return { status, raw: data }
}

// Verifikasi tanda tangan notifikasi (webhook) dari DOKU.
// requestTarget = path endpoint webhook kita (mis. /api/doku/notification).
function verifyNotification(settings, { requestTarget, headers, rawBody }) {
  try {
    const expected = buildSignature({
      clientId: headers['client-id'] || settings.doku_client_id,
      secretKey: settings.doku_secret_key,
      requestId: headers['request-id'],
      timestamp: headers['request-timestamp'],
      requestTarget,
      bodyString: rawBody,
    })
    const got = headers['signature'] || ''
    if (!got || got.length !== expected.length) return false
    return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected))
  } catch { return false }
}

// Petakan status DOKU → status internal (selaras gopay/qris: 'settlement'/gagal)
const SUCCESS_STATUSES = ['SUCCESS', 'SETTLEMENT', 'PAID']
const FAILED_STATUSES  = ['FAILED', 'EXPIRED', 'CANCELLED', 'CANCEL', 'VOID']
function mapStatus(dokuStatus) {
  const s = String(dokuStatus || '').toUpperCase()
  if (SUCCESS_STATUSES.includes(s)) return 'settlement'
  if (FAILED_STATUSES.includes(s))  return s.toLowerCase()
  return 'pending'
}

module.exports = { createCheckout, checkStatus, verifyNotification, mapStatus }
