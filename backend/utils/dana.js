// Integrasi DANA Payment Gateway memakai SDK resmi `dana-node`.
// SDK menangani base URL (sandbox/production), tanda tangan, dan header ORIGIN.
//  • createCheckout → createOrder (REDIRECT / hosted checkout) → webRedirectUrl
//  • queryStatus    → queryPayment
//  • verifySignature→ verifikasi tanda tangan webhook (tetap lokal)
const crypto = require('crypto')

// Lazy-load SDK DANA: bila modul belum terpasang, hanya fitur DANA yang gagal
// (dengan pesan jelas), bukan seluruh backend crash.
let _Dana
function getDana() {
  if (!_Dana) {
    try { _Dana = require('dana-node').Dana }
    catch { throw Object.assign(new Error('Modul "dana-node" belum terpasang di server. Jalankan: cd backend && npm install'), { status: 500 }) }
  }
  return _Dana
}

// Timestamp DANA: ISO8601 WIB +07:00, mis. 2026-10-25T16:46:41+07:00
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

// Muat private key robust (PEM / DER PKCS#8 / DER PKCS#1) → KeyObject.
function loadPrivateKey(raw) {
  if (!raw) throw Object.assign(new Error('Private Key DANA kosong'), { status: 400 })
  const k = raw.trim()
  if (k.includes('BEGIN')) return crypto.createPrivateKey(k)
  const der = Buffer.from(k.replace(/\s+/g, ''), 'base64')
  for (const t of ['pkcs8', 'pkcs1']) {
    try { return crypto.createPrivateKey({ key: der, format: 'der', type: t }) } catch { /* coba lain */ }
  }
  throw Object.assign(new Error('Private Key DANA tidak dikenali (PKCS#8/PKCS#1).'), { status: 400 })
}

function loadPublicKey(raw) {
  const k = (raw || '').trim()
  if (!k) return null
  if (k.includes('BEGIN')) { try { return crypto.createPublicKey(k) } catch { return null } }
  const der = Buffer.from(k.replace(/\s+/g, ''), 'base64')
  for (const t of ['spki', 'pkcs1']) {
    try { return crypto.createPublicKey({ key: der, format: 'der', type: t }) } catch { /* coba lain */ }
  }
  return null
}

// Private key dalam PEM PKCS#8 (format yang diterima SDK).
function privateKeyPem(raw) {
  return loadPrivateKey(raw).export({ type: 'pkcs8', format: 'pem' })
}

// Public key (SPKI PEM) yang BERPASANGAN dengan private key — untuk didaftarkan
// ke DANA. Jika ini tak cocok dengan yang diupload ke DANA → Invalid Signature.
function derivePublicKeyPem(privateKeyRaw) {
  const priv = loadPrivateKey(privateKeyRaw)
  return crypto.createPublicKey(priv).export({ type: 'spki', format: 'pem' })
}

function assertConfigured(settings) {
  const partner = settings.dana_partner_id || settings.dana_client_id
  if (!settings.dana_private_key || !partner || !settings.dana_merchant_id) {
    throw Object.assign(new Error('DANA belum lengkap. Isi Client ID, Merchant ID & Private Key di Pengaturan → DANA.'), { status: 400 })
  }
}

// Buat klien SDK DANA dari pengaturan toko.
function danaClient(settings, origin) {
  const Dana = getDana()
  return new Dana({
    partnerId:    settings.dana_partner_id || settings.dana_client_id,
    privateKey:   privateKeyPem(settings.dana_private_key),
    clientSecret: settings.dana_client_secret || undefined,
    origin:       origin || settings.dana_origin || process.env.PUBLIC_BASE_URL || undefined,
    env:          settings.dana_is_production ? 'production' : 'sandbox',
    debugMode:    'true',   // DANA kembalikan additionalInfo.debugMessage saat gagal
  })
}

// Ekstrak responseCode/message dari error SDK (ResponseError).
function danaError(e) {
  const raw   = e?.rawResponse || e?.response
  const code  = raw?.responseCode
  const debug = raw?.additionalInfo?.debugMessage
  const msg   = raw?.responseMessage || e?.errorMessage || e?.message || 'DANA gagal'
  const err   = new Error(`${msg}${code ? ' (' + code + ')' : ''}${debug ? ' — ' + debug : ''}`)
  err.status = 400
  err.dana   = raw
  return err
}

// Buat pembayaran (Hosted Checkout, scenario REDIRECT). → { url, referenceNo, raw }
async function createCheckout(settings, { invoiceNumber, amount, returnUrl, notifyUrl, origin }) {
  assertConfigured(settings)
  const dana = danaClient(settings, origin)
  const request = {
    partnerReferenceNo: invoiceNumber,
    merchantId: settings.dana_merchant_id,
    amount: { value: Number(amount).toFixed(2), currency: 'IDR' },
    // Sandbox SDK menolak validUpTo > 30 menit → pakai 25 menit.
    validUpTo: danaTimestamp(new Date(Date.now() + 25 * 60 * 1000)),
    urlParams: [
      { url: returnUrl, type: 'PAY_RETURN',   isDeeplink: 'N' },
      { url: notifyUrl, type: 'NOTIFICATION', isDeeplink: 'N' },
    ],
    additionalInfo: {
      mcc: settings.dana_mcc || '',
      envInfo: { sourcePlatform: 'IPG', terminalType: 'SYSTEM' },
      order: { orderTitle: (settings.store_name || 'Kasir Online').slice(0, 64) },
    },
  }
  if (settings.dana_sub_merchant_id)   request.subMerchantId   = settings.dana_sub_merchant_id
  if (settings.dana_external_store_id) request.externalStoreId = settings.dana_external_store_id

  let resp
  try {
    resp = await dana.paymentGatewayApi.createOrder(request)
  } catch (e) {
    let info
    try { info = JSON.stringify(e?.rawResponse || e?.response || { message: e?.message }) } catch { info = String(e?.message) }
    console.error('[DANA] createOrder error (status ' + (e?.status || '-') + '):', info)
    throw danaError(e)
  }
  const url = resp?.webRedirectUrl
  if (!String(resp?.responseCode || '').startsWith('200') || !url) {
    throw Object.assign(new Error(resp?.responseMessage || 'DANA tidak mengembalikan URL pembayaran.'), { status: 400 })
  }
  return { url, referenceNo: resp?.referenceNo || null, raw: resp }
}

// Cek status pembayaran → { status, raw }
async function queryStatus(settings, invoiceNumber, { origin } = {}) {
  assertConfigured(settings)
  const dana = danaClient(settings, origin)
  const request = {
    originalPartnerReferenceNo: invoiceNumber,
    merchantId: settings.dana_merchant_id,
    serviceCode: '54',
  }
  if (settings.dana_sub_merchant_id) request.subMerchantId = settings.dana_sub_merchant_id
  let resp
  try {
    resp = await dana.paymentGatewayApi.queryPayment(request)
  } catch (e) {
    throw danaError(e)
  }
  return { status: extractStatus(resp), raw: resp }
}

// ── Webhook (DANA → kita) — verifikasi & pemetaan status (tetap lokal) ─────────
function verifySignature(publicKeyPem, { method, path, rawBody, timestamp, signature }) {
  try {
    if (!publicKeyPem || !signature || !timestamp) return false
    const pubKey = loadPublicKey(publicKeyPem)
    if (!pubKey) return false
    const bodyHash = crypto.createHash('sha256').update(rawBody || '', 'utf8').digest('hex').toLowerCase()
    const stringToSign = `${method}:${path}:${bodyHash}:${timestamp}`
    const verifier = crypto.createVerify('RSA-SHA256')
    verifier.update(stringToSign, 'utf8')
    verifier.end()
    return verifier.verify(pubKey, signature, 'base64')
  } catch { return false }
}

function extractOrderRef(body) {
  return body?.originalPartnerReferenceNo || body?.partnerReferenceNo
      || body?.merchantTransId || body?.originalReferenceNo || body?.order?.orderId || null
}

function extractStatus(body) {
  return body?.latestTransactionStatus || body?.transactionStatus
      || body?.order?.orderStatus || body?.data?.latestTransactionStatus || null
}

// 00 Success · 05 Cancelled · 06 Failed · 07 Not found · dst.
function mapStatus(danaStatus) {
  const s = String(danaStatus || '').toUpperCase()
  if (s === '00' || s === 'SUCCESS' || s === 'PAID') return 'settlement'
  if (['05', '06', '07', 'CANCELLED', 'FAILED', 'EXPIRED', 'CLOSED'].includes(s)) return s.toLowerCase()
  return 'pending'
}

module.exports = { createCheckout, queryStatus, derivePublicKeyPem, verifySignature, extractOrderRef, extractStatus, mapStatus }
