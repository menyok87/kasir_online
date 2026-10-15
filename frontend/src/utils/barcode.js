// Scan barcode produk (ML Kit) untuk aplikasi Android.
//
// PENTING: kita memakai registerPlugin dari @capacitor/core — BUKAN import
// paket '@capacitor-mlkit/barcode-scanning' secara langsung. Dengan begitu
// build web (server.url) TIDAK butuh paket mlkit terpasang di node_modules
// (server produksi sering tak punya akses npm). Plugin native tetap disertakan
// di APK Android (lewat package.json + cap sync), dan di WebView Android
// registerPlugin menjembatani ke implementasi native berdasarkan nama.
import { Capacitor, registerPlugin } from '@capacitor/core'

export function isNativeApp() {
  try { return Capacitor.isNativePlatform() } catch { return false }
}

// Proxy ke plugin native 'BarcodeScanner' (disediakan @capacitor-mlkit/barcode-scanning di APK)
const BarcodeScanner = registerPlugin('BarcodeScanner')

// Buka scanner kamera, kembalikan teks barcode pertama (atau null bila batal).
// Lempar error yang ditangani pemanggil.
export async function scanBarcode() {
  if (!isNativeApp()) throw new Error('Scan barcode hanya tersedia di aplikasi Android')

  const { supported } = await BarcodeScanner.isSupported()
  if (!supported) throw new Error('Perangkat ini tidak mendukung scan barcode')

  // Modul Google Barcode Scanner (unbundled) — pasang bila belum ada
  try {
    const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable()
    if (!available) {
      await BarcodeScanner.installGoogleBarcodeScannerModule()
      throw new Error('Menyiapkan scanner sekali saja… coba scan lagi sebentar.')
    }
  } catch (e) {
    if (e?.message?.includes('Menyiapkan')) throw e   // teruskan pesan "siapkan"
    // isGoogleBarcodeScannerModuleAvailable tak didukung di sebagian device → lanjut saja
  }

  const { barcodes } = await BarcodeScanner.scan()
  return barcodes?.[0]?.rawValue || null
}
