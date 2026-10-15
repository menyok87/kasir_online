// Cek pembaruan aplikasi (Google Play In-App Updates) saat aplikasi dibuka.
//
// Memakai registerPlugin dari @capacitor/core agar build web tidak wajib
// meng-import paket '@capawesome/capacitor-app-update'. Plugin native tetap
// disertakan di APK (lewat package.json + cap sync), dan di WebView Android
// registerPlugin menjembatani ke implementasi native berdasarkan nama.
import { Capacitor, registerPlugin } from '@capacitor/core'

export function isNativeApp() {
  try { return Capacitor.isNativePlatform() } catch { return false }
}

const AppUpdate = registerPlugin('AppUpdate')

// AppUpdateAvailability.UPDATE_AVAILABLE
const UPDATE_AVAILABLE = 2

// Jika ada versi lebih baru di Play Store, tampilkan alur update Google
// (layar update penuh). Bila mode immediate tidak diizinkan, buka halaman
// Play Store aplikasi. Semua error diabaikan diam-diam agar tidak mengganggu
// pemakaian (mis. aplikasi tidak dipasang dari Play Store / offline).
export async function checkForUpdate() {
  if (!isNativeApp()) return
  try {
    const info = await AppUpdate.getAppUpdateInfo()
    if (info?.updateAvailability !== UPDATE_AVAILABLE) return

    if (info.immediateUpdateAllowed) {
      await AppUpdate.performImmediateUpdate()
    } else {
      await AppUpdate.openAppStore()
    }
  } catch {
    // Sengaja diabaikan — cek update tidak boleh memblokir pembukaan aplikasi.
  }
}
