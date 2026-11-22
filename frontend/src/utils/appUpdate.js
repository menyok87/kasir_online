// Pembaruan aplikasi otomatis (Google Play In-App Updates) — TANPA membuka
// Play Store. Strategi:
//  • Update biasa  → diunduh di LATAR BELAKANG (flexible), pengguna tetap
//    memakai aplikasi; dipasang otomatis saat aplikasi dibuka ulang.
//  • Update wajib (prioritas tinggi) → layar update penuh Google (immediate).
//  • Dicek setiap aplikasi dibuka dan setiap kembali aktif dari background.
//
// Memakai registerPlugin agar build web tidak wajib meng-import paket;
// plugin native disertakan di APK lewat cap sync.
import { Capacitor, registerPlugin } from '@capacitor/core'
import toast from 'react-hot-toast'

export function isNativeApp() {
  try { return Capacitor.isNativePlatform() } catch { return false }
}

const AppUpdate = registerPlugin('AppUpdate')

const UPDATE_AVAILABLE = 2   // AppUpdateAvailability.UPDATE_AVAILABLE
const DOWNLOADED       = 11  // FlexibleUpdateInstallStatus.DOWNLOADED
const HIGH_PRIORITY    = 4   // 0..5 — dari Play Console (set saat rilis)

let _flexListener = null
let _checking     = false
let _notified     = false

// Pasang listener progres unduhan flexible (sekali saja).
async function ensureFlexListener() {
  if (_flexListener) return
  try {
    _flexListener = await AppUpdate.addListener('onFlexibleUpdateStateChange', (state) => {
      if (state?.installStatus === DOWNLOADED && !_notified) {
        _notified = true
        toast.success('Pembaruan telah diunduh. Akan dipasang otomatis saat aplikasi dibuka ulang.', { duration: 6000 })
      }
    })
  } catch { /* abaikan */ }
}

// Cek & proses pembaruan. Aman dipanggil berkali-kali.
export async function checkForUpdate() {
  if (!isNativeApp() || _checking) return
  _checking = true
  try {
    const info = await AppUpdate.getAppUpdateInfo()

    // 1) Update flexible yang SUDAH diunduh → pasang sekarang (momen aman: saat buka app).
    if (info?.installStatus === DOWNLOADED) {
      await AppUpdate.completeFlexibleUpdate()
      return
    }

    // 2) Tidak ada update → selesai.
    if (info?.updateAvailability !== UPDATE_AVAILABLE) return

    const priority = Number(info.updatePriority ?? 0)

    // 3) Update WAJIB (prioritas tinggi) → layar penuh Google, harus diperbarui.
    if (priority >= HIGH_PRIORITY && info.immediateUpdateAllowed) {
      await AppUpdate.performImmediateUpdate()
      return
    }

    // 4) Update biasa → unduh di latar belakang (tidak mengganggu kasir).
    if (info.flexibleUpdateAllowed) {
      await ensureFlexListener()
      await AppUpdate.startFlexibleUpdate()
    } else if (info.immediateUpdateAllowed) {
      await AppUpdate.performImmediateUpdate()
    } else {
      await AppUpdate.openAppStore()
    }
  } catch {
    // Diabaikan — cek update tidak boleh mengganggu pemakaian
    // (mis. aplikasi tidak dipasang dari Play Store / offline).
  } finally {
    _checking = false
  }
}

// Panggil sekali saat aplikasi start. Cek di awal + setiap kembali aktif.
export function watchForUpdates() {
  if (!isNativeApp()) return
  checkForUpdate()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate()
  })
}
