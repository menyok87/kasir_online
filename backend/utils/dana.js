// Verifikasi & pemetaan status webhook DANA (standar SNAP Bank Indonesia).
// Dipakai endpoint /api/dana/notification untuk menerima notifikasi pembayaran.
const crypto = require('crypto')

// Rapikan public key DANA jadi PEM yang valid (bila user menempel tanpa header).
function normalizePublicKey(key) {
  if (!key) return ''
  const k = key.trim()
  if (k.includes('BEGIN')) return k
  const body = k.replace(/\s+/g, '').match(/.{1,64}/g)?.join('\n') || ''
  return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`
}

// Verifikasi X-SIGNATURE asymmetric (SHA256withRSA) sesuai SNAP.
// stringToSign = METHOD:RELATIVE_PATH:lowerhex(sha256(minifiedBody)):X-TIMESTAMP
function verifySignature(publicKeyPem, { method, path, rawBody, timestamp, signature }) {
  try {
    if (!publicKeyPem || !signature || !timestamp) return false
    const bodyHash = crypto.createHash('sha256').update(rawBody || '', 'utf8').digest('hex').toLowerCase()
    const stringToSign = `${method}:${path}:${bodyHash}:${timestamp}`
    const verifier = crypto.createVerify('RSA-SHA256')
    verifier.update(stringToSign, 'utf8')
    verifier.end()
    return verifier.verify(normalizePublicKey(publicKeyPem), signature, 'base64')
  } catch { return false }
}

// Ambil order reference (= invoice number kita) dari berbagai bentuk body DANA.
function extractOrderRef(body) {
  return body?.originalPartnerReferenceNo
      || body?.partnerReferenceNo
      || body?.merchantTransId
      || body?.originalReferenceNo
      || body?.order?.orderId
      || null
}

// Ambil status transaksi dari berbagai bentuk body DANA.
function extractStatus(body) {
  return body?.latestTransactionStatus
      || body?.transactionStatus
      || body?.order?.orderStatus
      || body?.data?.latestTransactionStatus
      || null
}

// Petakan status DANA (SNAP) → status internal (selaras gopay/qris/doku).
// 00 Success · 01 Initiated · 02 Paying · 03 Pending · 04 Refunded ·
// 05 Cancelled · 06 Failed · 07 Not found
function mapStatus(danaStatus) {
  const s = String(danaStatus || '').toUpperCase()
  if (s === '00' || s === 'SUCCESS' || s === 'PAID') return 'settlement'
  if (['05', '06', '07', 'CANCELLED', 'FAILED', 'EXPIRED', 'CLOSED'].includes(s)) return s.toLowerCase()
  return 'pending'
}

module.exports = { verifySignature, extractOrderRef, extractStatus, mapStatus, normalizePublicKey }
