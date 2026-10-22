const midtransClient = require('midtrans-client')

// Core API client dari pengaturan toko (dipakai GoPay & QRIS)
function getCoreApi(settings) {
  return new midtransClient.CoreApi({
    isProduction: settings.midtrans_is_production || false,
    serverKey:    settings.midtrans_server_key,
    clientKey:    settings.midtrans_client_key,
  })
}

// Terjemahkan error Midtrans jadi pesan yang jelas untuk kasir
function friendlyMidtransError(err) {
  const code   = String(err.httpStatusCode || err.ApiResponse?.status_code || '')
  const apiMsg = err.ApiResponse?.status_message
  if (code === '401') return 'Server Key Midtrans salah. Periksa di Pengaturan → GoPay.'
  if (code === '404') return 'Channel pembayaran tidak ditemukan. Pastikan Mode (Sandbox/Production) cocok dengan Server Key, dan channel (QRIS/GoPay) sudah aktif di akun Midtrans.'
  if (code === '402') return apiMsg || 'Metode pembayaran belum aktif untuk akun Midtrans ini.'
  if (apiMsg) return `Midtrans: ${apiMsg}`
  return null
}

module.exports = { getCoreApi, friendlyMidtransError }
