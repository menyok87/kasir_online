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

// Muat private key yang robust: jika sudah PEM → pakai apa adanya; jika base64
// DER mentah → coba PKCS#8 lalu PKCS#1 (DANA bisa memberi salah satunya).
function loadPrivateKey(raw) {
  if (!raw) throw Object.assign(new Error('Private Key DANA kosong'), { status: 400 })
  const k = raw.trim()
  if (k.includes('BEGIN')) {
    try { return crypto.createPrivateKey(k) } catch (e) {
      throw Object.assign(new Error('Private Key DANA tidak valid: ' + e.message), { status: 400 })
    }
  }
  const der = Buffer.from(k.replace(/\s+/g, ''), 'base64')
  for (const type of ['pkcs8', 'pkcs1']) {
    try { return crypto.createPrivateKey({ key: der, format: 'der', type }) } catch { /* coba format lain */ }
  }
  throw Object.assign(new Error('Private Key DANA tidak dikenali (bukan PKCS#8/PKCS#1). Tempel isi key apa adanya dari dashboard DANA.'), { status: 400 })
}

// Muat public key DANA: PEM apa adanya, atau base64 DER → coba SPKI lalu PKCS#1.
function loadPublicKey(raw) {
  const k = (raw || '').trim()
  if (!k) return null
  if (k.includes('BEGIN')) { try { return crypto.createPublicKey(k) } catch { return null } }
  const der = Buffer.from(k.replace(/\s+/g, ''), 'base64')
  for (const type of ['spki', 'pkcs1']) {
    try { return crypto.createPublicKey({ key: der, format: 'der', type }) } catch { /* coba format lain */ }
  }
  return null
}

// Tanda tangan request (dikirim ke DANA): base64(RSA-SHA256(stringToSign, privateKey))
// stringToSign = METHOD:RELATIVE_PATH:lowerhex(sha256(minifiedBody)):X-TIMESTAMP
function signRequest(privateKeyPem, { method, path, bodyString, timestamp }) {
  const bodyHash = crypto.createHash('sha256').update(bodyString || '', 'utf8').digest('hex').toLowerCase()
  const stringToSign = `${method}:${path}:${bodyHash}:${timestamp}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(stringToSign, 'utf8')
  signer.end()
  return signer.sign(loadPrivateKey(privateKeyPem), 'base64')
}

function assertConfigured(settings) {
  const partner = settings.dana_partner_id || settings.dana_client_id
  if (!settings.dana_private_key || !partner || !settings.dana_merchant_id) {
    throw Object.assign(new Error('DANA belum lengkap. Isi Client ID, Merchant ID & Private Key di Pengaturan → DANA.'), { status: 400 })
  }
}

async function danaPost(settings, path, body, opts = {}) {
  const bodyString = JSON.stringify(body)
  const timestamp  = danaTimestamp()
  // forceSignature dipakai untuk skenario uji "invalid signature".
  const signature  = opts.forceSignature || signRequest(settings.dana_private_key, { method: 'POST', path, bodyString, timestamp })

  const headers = {
    'Content-Type': 'application/json',
    'X-TIMESTAMP': timestamp,
    'X-SIGNATURE': signature,
    // DANA PG: X-PARTNER-ID = Client ID (dashboard tak punya Partner ID terpisah)
    'X-PARTNER-ID': settings.dana_partner_id || settings.dana_client_id,
    'X-EXTERNAL-ID': crypto.randomUUID(),
    'CHANNEL-ID': settings.dana_channel_id || '95221',
  }
  if (settings.dana_origin) headers['ORIGIN'] = settings.dana_origin

  const resp = await fetch(baseUrl(settings) + path, { method: 'POST', headers, body: bodyString })
  const text = await resp.text()
  let data = {}
  try { data = JSON.parse(text) } catch { /* respons bukan JSON (mis. HTML error WAF) */ }
  return { resp, data, text }
}

// Buat pembayaran (Hosted Checkout). Mengembalikan { url, referenceNo, raw }.
async function createCheckout(settings, { invoiceNumber, amount, returnUrl, notifyUrl }) {
  assertConfigured(settings)
  const path   = '/payment-gateway/v1.0/debit/payment-host-to-host.htm'
  const val    = Number(amount).toFixed(2)
  // Hosted Checkout (scenario REDIRECT): DANA menampilkan halaman cashier &
  // mengembalikan webRedirectUrl. TANPA payOptionDetails (pelanggan pilih sendiri).
  const body = {
    partnerReferenceNo: invoiceNumber,
    merchantId: settings.dana_merchant_id,
    amount: { value: val, currency: 'IDR' },
    validUpTo: danaTimestamp(new Date(Date.now() + 60 * 60 * 1000)),
    urlParams: [
      { url: returnUrl, type: 'PAY_RETURN',   isDeeplink: 'N' },
      { url: notifyUrl, type: 'NOTIFICATION', isDeeplink: 'N' },
    ],
    additionalInfo: {
      order: { orderTitle: (settings.store_name || 'Kasir Online').slice(0, 64), scenario: 'REDIRECT' },
      envInfo: { sourcePlatform: 'IPG', terminalType: 'SYSTEM' },
    },
  }
  if (settings.dana_mcc)               body.additionalInfo.mcc = settings.dana_mcc
  if (settings.dana_sub_merchant_id)   body.subMerchantId      = settings.dana_sub_merchant_id
  if (settings.dana_external_store_id) body.externalStoreId    = settings.dana_external_store_id

  console.log('[DANA] createCheckout request:', JSON.stringify(body))
  const { resp, data, text } = await danaPost(settings, path, body)
  const url = data?.webRedirectUrl || data?.redirectUrl
    || data?.additionalInfo?.webRedirectUrl
    || data?.actions?.find?.(a => /redirect|checkout|pay/i.test(a?.name || ''))?.url
    || null

  const okCode = String(data?.responseCode || '').startsWith('200')
  if (!resp.ok || !okCode || !url) {
    console.error('[DANA] createCheckout gagal:', resp.status, (text || '').slice(0, 500))
    const snippet = (text || '').replace(/\s+/g, ' ').trim().slice(0, 200)
    const base = data?.responseMessage || data?.message
      || `DANA menolak (HTTP ${resp.status}${data?.responseCode ? ', code ' + data.responseCode : ''})`
    const invalidClient = String(data?.responseCode) === '4015400' || /invalid client/i.test(base)
    const hint = resp.status === 403
      ? ' — kemungkinan kredensial belum aktif (tunggu ~30 menit) atau IP server belum di-allowlist di dashboard DANA.'
      : invalidClient
        ? ` — Client ID tidak dikenali di mode ${settings.dana_is_production ? 'Production' : 'Sandbox'}. Pastikan Mode cocok dengan kredensial (sandbox vs production) & akses sudah aktif di DANA.`
        : ''
    throw Object.assign(new Error(base + hint + (snippet ? ` [${snippet}]` : '')), { status: 400, dana: data })
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

// Skenario uji sertifikasi: kirim request dengan X-SIGNATURE tidak valid.
// Harus mendapat 4015400 "Unauthorized. Invalid Signature" dari DANA.
async function testInvalidSignature(settings, { notifyUrl }) {
  const partner = settings.dana_partner_id || settings.dana_client_id
  if (!partner || !settings.dana_merchant_id) {
    throw Object.assign(new Error('Isi Client ID & Merchant ID dulu di Pengaturan → DANA.'), { status: 400 })
  }
  const path = '/payment-gateway/v1.0/debit/payment-host-to-host.htm'
  const body = {
    partnerReferenceNo: crypto.randomUUID(),
    merchantId: settings.dana_merchant_id,
    amount: { value: '10000.00', currency: 'IDR' },
    validUpTo: danaTimestamp(new Date(Date.now() + 60 * 60 * 1000)),
    urlParams: [
      { url: notifyUrl, type: 'PAY_RETURN',   isDeeplink: 'N' },
      { url: notifyUrl, type: 'NOTIFICATION', isDeeplink: 'N' },
    ],
    additionalInfo: {
      order: { orderTitle: (settings.store_name || 'Kasir Online').slice(0, 64), scenario: 'REDIRECT' },
      envInfo: { sourcePlatform: 'IPG', terminalType: 'SYSTEM' },
    },
  }
  if (settings.dana_mcc) body.additionalInfo.mcc = settings.dana_mcc

  const { resp, data, text } = await danaPost(settings, path, body, { forceSignature: 'invalid_signature' })
  return { httpStatus: resp.status, responseCode: data?.responseCode || null, responseMessage: data?.responseMessage || (text || '').slice(0, 200) }
}

// Body checkout untuk uji (ref & amount dapat diatur).
function buildTestBody(settings, { ref, value, notifyUrl }) {
  const b = {
    partnerReferenceNo: ref,
    merchantId: settings.dana_merchant_id,
    amount: { value, currency: 'IDR' },
    validUpTo: danaTimestamp(new Date(Date.now() + 60 * 60 * 1000)),
    urlParams: [
      { url: notifyUrl, type: 'PAY_RETURN',   isDeeplink: 'N' },
      { url: notifyUrl, type: 'NOTIFICATION', isDeeplink: 'N' },
    ],
    additionalInfo: {
      order: { orderTitle: (settings.store_name || 'Kasir Online').slice(0, 64), scenario: 'REDIRECT' },
      envInfo: { sourcePlatform: 'IPG', terminalType: 'SYSTEM' },
    },
  }
  if (settings.dana_mcc) b.additionalInfo.mcc = settings.dana_mcc
  return b
}

// Skenario uji: order kedua dengan partnerReferenceNo sama tapi amount beda.
// Harus mendapat 4045418 "Inconsistent Request".
async function testInconsistentRequest(settings, { notifyUrl }) {
  assertConfigured(settings)
  const path = '/payment-gateway/v1.0/debit/payment-host-to-host.htm'
  const ref  = crypto.randomUUID()
  const first  = await danaPost(settings, path, buildTestBody(settings, { ref, value: '100000.00', notifyUrl }))
  const second = await danaPost(settings, path, buildTestBody(settings, { ref, value: '200000.00', notifyUrl }))
  return {
    firstResponseCode: first.data?.responseCode || null,
    httpStatus: second.resp.status,
    responseCode: second.data?.responseCode || null,
    responseMessage: second.data?.responseMessage || (second.text || '').slice(0, 200),
  }
}

// ── Webhook (DANA → kita) ─────────────────────────────────────────────────────
// Verifikasi X-SIGNATURE asymmetric (public key DANA).
function verifySignature(publicKeyPem, { method, path, rawBody, timestamp, signature }) {
  try {
    if (!publicKeyPem || !signature || !timestamp) return false
    const bodyHash = crypto.createHash('sha256').update(rawBody || '', 'utf8').digest('hex').toLowerCase()
    const stringToSign = `${method}:${path}:${bodyHash}:${timestamp}`
    const pubKey = loadPublicKey(publicKeyPem)
    if (!pubKey) return false
    const verifier = crypto.createVerify('RSA-SHA256')
    verifier.update(stringToSign, 'utf8')
    verifier.end()
    return verifier.verify(pubKey, signature, 'base64')
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

module.exports = { createCheckout, queryStatus, testInvalidSignature, testInconsistentRequest, verifySignature, extractOrderRef, extractStatus, mapStatus }
