// Helper autentikasi sidik jari (biometrik) untuk aplikasi Android (Capacitor).
// Aman dipanggil di web browser — otomatis no-op (tidak error).
import { Capacitor } from '@capacitor/core'
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth'

export const BIO_KEY = 'biometricEnabled'

// Apakah berjalan sebagai aplikasi native (Android/iOS), bukan browser
export function isNativeApp() {
  try { return Capacitor.isNativePlatform() } catch { return false }
}

// Apakah perangkat punya biometrik terdaftar (sidik jari / wajah)
export async function biometricAvailable() {
  if (!isNativeApp()) return false
  try {
    const info = await BiometricAuth.checkBiometry()
    return !!info.isAvailable
  } catch { return false }
}

// Minta verifikasi sidik jari. Resolve bila sukses, throw bila gagal/batal.
export async function verifyBiometric(reason = 'Verifikasi untuk masuk') {
  await BiometricAuth.authenticate({
    reason,
    cancelTitle: 'Batal',
    allowDeviceCredential: true,           // fallback ke PIN/pola perangkat
    androidTitle: 'Kasir Online',
    androidSubtitle: reason,
    androidConfirmationRequired: false,
    iosFallbackTitle: 'Gunakan PIN',
  })
  return true
}

export function isBiometricEnabled() {
  return localStorage.getItem(BIO_KEY) === '1'
}
export function setBiometricEnabled(on) {
  if (on) localStorage.setItem(BIO_KEY, '1')
  else localStorage.removeItem(BIO_KEY)
}

// ── Login dengan sidik jari ───────────────────────────────────────────────────
// Menyimpan sesi (token + user) di perangkat agar bisa dipulihkan lewat sidik
// jari tanpa mengetik sandi. Token tersimpan selama sesi masih berlaku (7 hari);
// bila kedaluwarsa, pengguna cukup login sandi sekali dan sesi tersimpan segar.
export const BIO_LOGIN_FLAG = 'bioLoginEnabled'
const BIO_TOKEN = 'bioToken'
const BIO_USER  = 'bioUser'

export function isBiometricLoginEnabled() {
  return localStorage.getItem(BIO_LOGIN_FLAG) === '1'
}

// Simpan/segarkan sesi untuk login sidik jari & tandai aktif.
export function enableBiometricLogin(token, user) {
  try {
    localStorage.setItem(BIO_TOKEN, token)
    localStorage.setItem(BIO_USER, JSON.stringify(user))
    localStorage.setItem(BIO_LOGIN_FLAG, '1')
  } catch {}
}

export function disableBiometricLogin() {
  localStorage.removeItem(BIO_TOKEN)
  localStorage.removeItem(BIO_USER)
  localStorage.removeItem(BIO_LOGIN_FLAG)
}

// Ambil sesi tersimpan (atau null bila tidak ada / rusak).
export function getBiometricLogin() {
  try {
    const token = localStorage.getItem(BIO_TOKEN)
    const user  = JSON.parse(localStorage.getItem(BIO_USER) || 'null')
    if (token && user) return { token, user }
  } catch {}
  return null
}

// Segarkan token tersimpan bila fitur aktif (dipanggil setelah login sandi).
export function refreshBiometricLogin(token, user) {
  if (isBiometricLoginEnabled()) enableBiometricLogin(token, user)
}
