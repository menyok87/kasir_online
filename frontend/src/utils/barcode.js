// Scan barcode produk (ML Kit) untuk aplikasi Android.
import { Capacitor } from '@capacitor/core'

export function isNativeApp() {
  try { return Capacitor.isNativePlatform() } catch { return false }
}

let _scanner = null
async function getScanner() {
  if (!_scanner) {
    const m = await import('@capacitor-mlkit/barcode-scanning')
    _scanner = m.BarcodeScanner
  }
  return _scanner
}

// Buka scanner kamera, kembalikan teks barcode pertama (atau null bila batal).
// Lempar error yang ditangani pemanggil.
export async function scanBarcode() {
  if (!isNativeApp()) throw new Error('Scan barcode hanya tersedia di aplikasi Android')
  const Scanner = await getScanner()

  const { supported } = await Scanner.isSupported()
  if (!supported) throw new Error('Perangkat ini tidak mendukung scan barcode')

  // Modul Google Barcode Scanner (unbundled) — pasang bila belum ada
  try {
    const { available } = await Scanner.isGoogleBarcodeScannerModuleAvailable()
    if (!available) {
      await Scanner.installGoogleBarcodeScannerModule()
      throw new Error('Menyiapkan scanner sekali saja… coba scan lagi sebentar.')
    }
  } catch (e) {
    if (e?.message?.includes('Menyiapkan')) throw e   // teruskan pesan "siapkan"
    // isGoogleBarcodeScannerModuleAvailable tak didukung di sebagian device → lanjut saja
  }

  const { barcodes } = await Scanner.scan()
  return barcodes?.[0]?.rawValue || null
}
