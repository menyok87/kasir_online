// Integrasi DANA Payment Gateway (SNAP Bank Indonesia):
//  • createCheckout → buat order & dapatkan link pembayaran (Hosted Checkout)
//  • queryStatus    → cek status transaksi
//  • verifySignature→ verifikasi webhook notifikasi
// Tanda tangan request: asymmetric SHA256withRSA (private key merchant).
const crypto = require('crypto')

function baseUrl(settings) {
  return settings.dana_is_production ? 'https://api.dana.id' : 'https://api.sandbox.dana.id'
}

// Timestamp DANA: ISO8601 waktu WIB dengan offset +07:00, mis. 2026-10-25T16:46:41+07:00
function danaTimestamp(date = new Date()) {
  const wib = new Date(date.getTime() + 7 * 3600 * 1000)
  return wib.toISOString().slice(0, 19) + '+07:00'
}

function normalizeKey(key, type) {
  if (!key) return ''
  const k = key.trim()
  if (k.includes('BEGIN')) return k
  const body = k.replace(/\s+/g, '').match(/.{1,64}/g)?.join('\n') || ''
  return `-----BEGIN ${type}-----\n${body}\n-----END ${type}-----`
}

// Tanda tangan request (dikirim ke DANA): base64(RSA-SHA256(stringToSign, privateKey))
// stringToSign = METHOD:RELATIVE_PATH:lowerhex(sha256(minifiedBody)):X-TIMESTAMP
function signRequest(privateKeyPem, { method, path, bodyString, timestamp }) {
  const bodyHash = crypto.createHash('sha256').update(bodyString || '', 'utf8').digest('hex').toLowerCase()
  const stringToSign = `${method}:${path}:${bodyHash}:${timestamp}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(stringToSign, 'utf8')
  signer.end()
  return signer.sign(normalizeKey(privateKeyPem, 'PRIVATE KEY'), 'base64')
}

function assertConfigured(settings) {
  if (!settings.dana_private_key || !settings.dana_partner_id || !settings.dana_merchant_id) {
    throw Object.assign(new Error('DANA belum lengkap. Isi Partner ID, Merchant ID & Private Key di Pengaturan → DANA.'), { status: 400 })
  }
}

async function danaPost(settings, path, body) {
  const bodyString = JSON.stringify(body)
  const timestamp  = danaTimestamp()
  const signature  = signRequest(settings.dana_private_key, { method: 'POST', path, bodyString, timestamp })

  const resp = await fetch(baseUrl(settings) + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-TIMESTAMP': timestamp,
      'X-SIGNATURE': signature,
      'X-PARTNER-ID': settings.dana_partner_id,
      'X-EXTERNAL-ID': crypto.randomUUID(),
      'CHANNEL-ID': settings.dana_channel_id || '95221',
      'ORIGIN': settings.dana_origin || '',
    },
    body: bodyString,
  })
  const data = await resp.json().catch(() => ({}))
  return { resp, data }
}

// Buat pembayaran (Hosted Checkout). Mengembalikan { url, referenceNo, raw }.
async function createCheckout(settings, { invoiceNumber, amount, returnUrl, notifyUrl }) {
  assertConfigured(settings)
  const path   = '/payment-gateway/v1.0/debit/payment-host-to-host.htm'
  const val    = Number(amount).toFixed(2)
  const body = {
    partnerReferenceNo: invoiceNumber,
    merchantId: settings.dana_merchant_id,
    amount: { value: val, currency: 'IDR' },
    validUpTo: danaTimestamp(new Date(Date.now() + 60 * 60 * 1000)),
    urlParams: [
      { url: returnUrl, type: 'PAY_RETURN',   isDeeplink: 'N' },
      { url: notifyUrl, type: 'NOTIFICATION', isDeeplink: 'N' },
    ],
    payOptionDetails: [
      { payMethod: 'NETWORK_PAY', payOption: settings.dana_pay_option || 'NETWORK_PAY_PG_QRIS',
        transAmount: { value: val, currency: 'IDR' } },
    ],
    additionalInfo: {
      order: { orderTitle: (settings.store_name || 'Kasir Online').slice(0, 64), scenario: 'API' },
      envInfo: { sourcePlatform: 'IPG', terminalType: 'SYSTEM' },
    },
  }
  if (settings.dana_sub_merchant_id)  body.subMerchantId  = settings.dana_sub_merchant_id
  if (settings.dana_external_store_id) body.externalStoreId = settings.dana_external_store_id

  const { resp, data } = await danaPost(settings, path, body)
  const url = data?.webRedirectUrl || data?.redirectUrl
    || data?.additionalInfo?.webRedirectUrl
    || data?.actions?.find?.(a => /redirect|checkout|pay/i.test(a?.name || ''))?.url
    || null

  const okCode = String(data?.responseCode || '').startsWith('200')
  if (!resp.ok || !okCode || !url) {
    const msg = data?.responseMessage || data?.message || `DANA gagal (HTTP ${resp.status}, code ${data?.responseCode || '-'})`
    throw Object.assign(new Error(msg), { status: 400, dana: data })
  }
  return { url, referenceNo: data?.referenceNo || null, raw: data }
}

// Cek status transaksi. Mengembalikan { status, raw }.
async function queryStatus(settings, invoiceNumber) {
  assertConfigured(settings)
  const path = '/payment-gateway/v1.0/debit/status.htm'
  const body = {
    originalPartnerReferenceNo: invoiceNumber,
    merchantId: settings.dana_merchant_id,
    serviceCode: '54',
  }
  if (settings.dana_sub_merchant_id) body.subMerchantId = settings.dana_sub_merchant_id
  const { data } = await danaPost(settings, path, body)
  return { status: extractStatus(data), raw: data }
}

// ── Webhook (DANA → kita) ─────────────────────────────────────────────────────
// Verifikasi X-SIGNATURE asymmetric (public key DANA).
function verifySignature(publicKeyPem, { method, path, rawBody, timestamp, signature }) {
  try {
    if (!publicKeyPem || !signature || !timestamp) return false
    const bodyHash = crypto.createHash('sha256').update(rawBody || '', 'utf8').digest('hex').toLowerCase()
    const stringToSign = `${method}:${path}:${bodyHash}:${timestamp}`
    const verifier = crypto.createVerify('RSA-SHA256')
    verifier.update(stringToSign, 'utf8')
    verifier.end()
    return verifier.verify(normalizeKey(publicKeyPem, 'PUBLIC KEY'), signature, 'base64')
  } catch { return false }
}

function extractOrderRef(body) {
  return body?.originalPartnerReferenceNo
      || body?.partnerReferenceNo
      || body?.merchantTransId
      || body?.originalReferenceNo
      || body?.order?.orderId
      || null
}

function extractStatus(body) {
  return body?.latestTransactionStatus
      || body?.transactionStatus
      || body?.order?.orderStatus
      || body?.data?.latestTransactionStatus
      || null
}

// 00 Success · 01 Initiated · 02 Paying · 03 Pending · 04 Refunded ·
// 05 Cancelled · 06 Failed · 07 Not found
function mapStatus(danaStatus) {
  const s = String(danaStatus || '').toUpperCase()
  if (s === '00' || s === 'SUCCESS' || s === 'PAID') return 'settlement'
  if (['05', '06', '07', 'CANCELLED', 'FAILED', 'EXPIRED', 'CLOSED'].includes(s)) return s.toLowerCase()
  return 'pending'
}

module.exports = { createCheckout, queryStatus, verifySignature, extractOrderRef, extractStatus, mapStatus }
