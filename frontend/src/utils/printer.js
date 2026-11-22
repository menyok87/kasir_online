// Cetak struk ke printer thermal Bluetooth (ESC/POS) untuk aplikasi Android.
// Aman dipanggil di web — fungsi no-op / lempar error yang ditangani pemanggil.
import { Capacitor } from '@capacitor/core'

let _plugin = null
async function getPlugin() {
  if (!_plugin) {
    const m = await import('capacitor-thermal-printer')
    _plugin = m.CapacitorThermalPrinter
  }
  return _plugin
}

export function isNativeApp() {
  try { return Capacitor.isNativePlatform() } catch { return false }
}

const K_ADDR = 'printerAddress', K_NAME = 'printerName', K_AUTO = 'printerAutoPrint'

export function getSavedPrinter() {
  const address = localStorage.getItem(K_ADDR)
  return address ? { address, name: localStorage.getItem(K_NAME) || address } : null
}
export function savePrinter(address, name) {
  localStorage.setItem(K_ADDR, address)
  localStorage.setItem(K_NAME, name || address)
}
export function clearPrinter() {
  localStorage.removeItem(K_ADDR); localStorage.removeItem(K_NAME)
}
export function isAutoPrint() { return localStorage.getItem(K_AUTO) === '1' }
export function setAutoPrint(on) { on ? localStorage.setItem(K_AUTO, '1') : localStorage.removeItem(K_AUTO) }

// Scan perangkat Bluetooth. onDevice({name,address}) dipanggil per perangkat,
// onFinish() saat selesai. Mengembalikan fungsi stop().
export async function scanPrinters(onDevice, onFinish) {
  const p = await getPlugin()
  const seen = new Set()
  const h1 = await p.addListener('discoverDevices', data => {
    const devs = data?.devices || (data?.device ? [data.device] : [])
    for (const d of devs) {
      if (d?.address && !seen.has(d.address)) { seen.add(d.address); onDevice(d) }
    }
  })
  const h2 = await p.addListener('discoveryFinish', () => onFinish?.())
  await p.startScan()
  return async () => {
    try { await p.stopScan() } catch { /* ignore */ }
    h1.remove(); h2.remove()
  }
}

async function ensureConnected(address) {
  const p = await getPlugin()
  try { if (await p.isConnected()) return } catch { /* ignore */ }
  await p.connect({ address })
}

// ── Format struk 58mm (32 kolom) ──────────────────────────────────────────────
const W = 32
function row(l, r) {
  l = String(l); r = String(r)
  const s = Math.max(1, W - l.length - r.length)
  return l + ' '.repeat(s) + r
}
const line = '-'.repeat(W)
function rp(n) { return 'Rp' + new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0)) }
const PAY = { cash: 'Tunai', qris: 'QRIS', gopay: 'GoPay', transfer: 'Transfer', card: 'Kartu' }

// Cetak struk ke printer tersimpan. Lempar error bila gagal (ditangani pemanggil).
export async function printThermal(tx, settings = {}) {
  if (!tx) return
  if (!isNativeApp()) throw new Error('Cetak Bluetooth hanya di aplikasi Android')
  const printer = getSavedPrinter()
  if (!printer) throw new Error('Printer belum dipilih. Atur di Pengaturan → Printer.')

  const p = await getPlugin()
  await ensureConnected(printer.address)

  const storeName = (settings.store_name || 'KASIR ONLINE').toUpperCase()
  const payLabel  = PAY[tx.payment_method] || tx.payment_method || '-'
  const dt = new Date(tx.created_at || Date.now()).toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  })

  let b = p.begin().align('center').bold().doubleWidth().text(storeName + '\n').clearFormatting()
  if (settings.store_tagline) b = b.text(settings.store_tagline + '\n')
  if (settings.store_address) b = b.text(settings.store_address + '\n')
  if (settings.store_phone)   b = b.text('Telp: ' + settings.store_phone + '\n')

  b = b.text(line + '\n').align('left')
  b = b.text(row('No', tx.invoice_number) + '\n')
  b = b.text(row('Tgl', dt) + '\n')
  b = b.text(row('Bayar', payLabel) + '\n')
  b = b.text(line + '\n')

  for (const it of (tx.items || [])) {
    b = b.text(String(it.product_name) + '\n')
    b = b.text(row(`  ${it.quantity} x ${rp(it.price)}`, rp(it.subtotal)) + '\n')
  }

  b = b.text(line + '\n')
  b = b.text(row('Subtotal', rp(tx.subtotal)) + '\n')
  if (tx.discount > 0) b = b.text(row('Diskon', '-' + rp(tx.discount)) + '\n')
  if (tx.tax > 0)      b = b.text(row('Pajak', rp(tx.tax)) + '\n')
  b = b.bold().text(row('TOTAL', rp(tx.grand_total)) + '\n').clearFormatting()
  b = b.text(row('Bayar', rp(tx.amount_paid)) + '\n')
  b = b.text(row('Kembali', rp(tx.change_amount)) + '\n')
  b = b.text(line + '\n').align('center')

  const footer = settings.footer_msg || 'Terima kasih telah berbelanja!'
  b = b.text(footer + '\n')
  if (settings.show_footer_note !== false) b = b.text('Simpan struk ini sebagai bukti\n')

  b = b.text('\n\n\n').cutPaper()
  await b.write()
}

// Cetak struk uji
export async function testPrint(settings = {}) {
  return printThermal({
    invoice_number: 'TEST-0001',
    created_at: new Date().toISOString(),
    payment_method: 'cash',
    items: [{ product_name: 'Produk Contoh', quantity: 1, price: 10000, subtotal: 10000 }],
    subtotal: 10000, discount: 0, tax: 0, grand_total: 10000, amount_paid: 20000, change_amount: 10000,
  }, settings)
}
