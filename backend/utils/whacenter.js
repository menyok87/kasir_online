// Kirim pesan WhatsApp via WhaCenter (https://app.whacenter.com/api/send).
// Dipakai untuk mengirim link pembayaran DOKU ke nomor WhatsApp pelanggan.

const SEND_URL = 'https://app.whacenter.com/api/send'

// Normalisasi nomor Indonesia → format 62xxxxxxxxxx (tanpa + / spasi / 0 depan).
function normalizePhone(raw) {
  let n = String(raw || '').replace(/[^0-9]/g, '')
  if (!n) return ''
  if (n.startsWith('0')) n = '62' + n.slice(1)
  else if (n.startsWith('8')) n = '62' + n
  // sudah 62... → biarkan
  return n
}

// Kirim pesan. Mengembalikan { ok, data } atau melempar error yang jelas.
async function sendWhatsApp(deviceId, phone, message) {
  if (!deviceId) throw Object.assign(new Error('WhaCenter Device ID belum diatur. Isi di Pengaturan → WhatsApp.'), { status: 400 })
  const number = normalizePhone(phone)
  if (!number) throw Object.assign(new Error('Nomor WhatsApp pelanggan tidak valid.'), { status: 400 })

  const form = new URLSearchParams()
  form.set('device_id', deviceId)
  form.set('number', number)
  form.set('message', message)

  let resp, data
  try {
    resp = await fetch(SEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    data = await resp.json().catch(() => ({}))
  } catch (e) {
    throw Object.assign(new Error('Gagal menghubungi WhaCenter: ' + e.message), { status: 502 })
  }

  // WhaCenter umumnya mengembalikan { status: true/false, message: '...' }
  const ok = resp.ok && (data.status === true || data.status === 'true' || data.success === true)
  if (!ok) {
    const msg = data?.message || data?.error || `WhaCenter gagal (HTTP ${resp.status})`
    throw Object.assign(new Error(typeof msg === 'string' ? msg : 'Gagal mengirim WhatsApp'), { status: 400 })
  }
  return { ok: true, data, number }
}

module.exports = { sendWhatsApp, normalizePhone }
