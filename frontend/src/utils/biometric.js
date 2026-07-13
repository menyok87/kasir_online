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
