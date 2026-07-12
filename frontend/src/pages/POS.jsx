import { useState, useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Printer, CheckCircle,
  Tag, ArrowLeft, X, FileDown, Wallet, QrCode, Building2, CreditCard,
  Package, ChevronRight, Sparkles, Smartphone, RefreshCw, XCircle, Clock, AlertCircle, Share2,
} from 'lucide-react'
import {
  getProducts, getCategories, createTransaction, getSettings,
  gopayCharge, gopayStatus, gopayCancel,
  qrisCharge, qrisStatus, qrisCancel,
} from '../api'
import { getImageUrl } from '../utils/getImageUrl'
import Modal from '../components/ui/Modal'
import { FullPageSpinner } from '../components/ui/Spinner'
import { printReceipt, downloadPDF, shareReceipt } from '../utils/printReceipt'
import { printThermal, isAutoPrint, getSavedPrinter, isNativeApp as printerNative } from '../utils/printer'

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

function formatShort(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}jt`
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 0)}k`
  return String(n)
}

function getQuickAmounts(total) {
  const all = [total, 5000, 10000, 20000, 50000, 100000, 200000, 500000]
  const seen = new Set()
  const result = []
  for (const n of all) {
    const v = n < total ? Math.ceil(total / n) * n : n
    if (v >= total && !seen.has(v)) { seen.add(v); result.push(v) }
    if (result.length === 4) break
  }
  return result
}

const PAYMENT_METHODS = [
  { val: 'cash',      label: 'Tunai',     Icon: Wallet,     color: 'emerald' },
  { val: 'gopay',     label: 'GoPay',     Icon: Smartphone, color: 'green' },
  { val: 'qris',      label: 'QRIS',      Icon: QrCode,     color: 'blue' },
  { val: 'qris_auto', label: 'QRIS Auto', Icon: QrCode,     color: 'cyan' },
  { val: 'transfer',  label: 'Transfer',  Icon: Building2,  color: 'violet' },
  { val: 'card',      label: 'Kartu',     Icon: CreditCard, color: 'orange' },
]

const COLOR_ACTIVE = {
  emerald: 'bg-emerald-500 text-white shadow-emerald-200 dark:shadow-emerald-900/40',
  green:   'bg-green-500 text-white shadow-green-200 dark:shadow-green-900/40',
  blue:    'bg-blue-500 text-white shadow-blue-200 dark:shadow-blue-900/40',
  cyan:    'bg-cyan-500 text-white shadow-cyan-200 dark:shadow-cyan-900/40',
  violet:  'bg-violet-500 text-white shadow-violet-200 dark:shadow-violet-900/40',
  orange:  'bg-orange-500 text-white shadow-orange-200 dark:shadow-orange-900/40',
}

// ── Kartu Produk ──────────────────────────────────────────────────────────────
function ProductCard({ product, onAdd }) {
  const outOfStock = product.stock === 0
  const lowStock   = product.stock > 0 && product.stock <= 5

  return (
    <button
      onClick={() => !outOfStock && onAdd(product)}
      disabled={outOfStock}
      className={`group relative bg-white dark:bg-gray-800 rounded-2xl border text-left transition-all duration-200 w-full overflow-hidden
        ${outOfStock
          ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700'
          : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-100 dark:hover:shadow-blue-900/20 active:scale-95'
        }`}
    >
      {/* Gambar / Placeholder */}
      <div className="relative w-full aspect-square overflow-hidden rounded-t-2xl bg-gradient-to-br from-slate-100 to-blue-50 dark:from-gray-700 dark:to-gray-800">
        {product.image_url ? (
          <img
            src={getImageUrl(product.image_url)}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={24} className="text-blue-200 dark:text-gray-600" />
          </div>
        )}

        {/* Stock badge */}
        {!outOfStock && (
          <div className={`absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-lg
            ${lowStock
              ? 'bg-amber-400 text-amber-900'
              : 'bg-white/80 dark:bg-gray-900/70 text-gray-500 dark:text-gray-400 backdrop-blur-sm'
            }`}>
            {lowStock ? `Sisa ${product.stock}` : `${product.stock}`}
          </div>
        )}

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Habis</span>
          </div>
        )}

        {/* Hover add overlay */}
        {!outOfStock && (
          <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors duration-200 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center
              opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-200 shadow-lg">
              <Plus size={16} />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-tight line-clamp-2 mb-1 min-h-[2rem]">
          {product.name}
        </p>
        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatRupiah(product.price)}</p>
      </div>
    </button>
  )
}

// ── Item Keranjang ────────────────────────────────────────────────────────────
function CartItem({ item, onIncrease, onDecrease, onRemove }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-50 to-slate-100 dark:from-gray-700 dark:to-gray-800 border border-gray-100 dark:border-gray-700">
        {item.product.image_url ? (
          <img src={getImageUrl(item.product.image_url)} alt={item.product.name} loading="lazy" decoding="async"
            className="w-full h-full object-cover"
            onError={e => { e.target.style.display = 'none' }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={14} className="text-blue-200 dark:text-gray-600" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">{item.product.name}</p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{formatRupiah(item.product.price)}</p>
        <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{formatRupiah(item.product.price * item.quantity)}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => onDecrease(item.product.id)}
          className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 flex items-center justify-center transition-all text-gray-500 dark:text-gray-400 active:scale-90">
          <Minus size={11} />
        </button>
        <span className="w-6 text-center text-sm font-bold text-gray-800 dark:text-gray-100 tabular-nums">{item.quantity}</span>
        <button onClick={() => onIncrease(item.product.id)}
          disabled={item.quantity >= item.product.stock}
          className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 text-blue-600 flex items-center justify-center transition-all disabled:opacity-40 active:scale-90">
          <Plus size={11} />
        </button>
        <button onClick={() => onRemove(item.product.id)}
          className="w-7 h-7 rounded-lg text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 flex items-center justify-center transition-all ml-0.5 active:scale-90">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Modal Struk ───────────────────────────────────────────────────────────────
function ReceiptModal({ isOpen, transaction, settings, onClose }) {
  if (!transaction) return null
  const paymentLabel = { cash: 'Tunai', gopay: 'GoPay', qris: 'QRIS', transfer: 'Transfer', card: 'Kartu' }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="sm">
      {/* Success header */}
      <div className="text-center mb-5">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
          <CheckCircle size={36} className="text-green-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Pembayaran Berhasil!</h3>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{transaction.invoice_number}</p>
      </div>

      {/* Receipt body */}
      <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-4 space-y-2">
        <div className="space-y-1.5">
          {transaction.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-gray-700 dark:text-gray-200">
                {item.product_name} <span className="text-gray-400">×{item.quantity}</span>
              </span>
              <span className="font-semibold">{formatRupiah(item.subtotal)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-dashed border-gray-300 dark:border-gray-600 pt-2 space-y-1">
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>Subtotal</span><span>{formatRupiah(transaction.subtotal)}</span>
          </div>
          {transaction.discount > 0 && (
            <div className="flex justify-between text-xs text-emerald-600">
              <span>Diskon</span><span>- {formatRupiah(transaction.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm">
            <span>Total</span>
            <span className="text-blue-600 dark:text-blue-400">{formatRupiah(transaction.grand_total)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>Bayar ({paymentLabel[transaction.payment_method]})</span>
            <span>{formatRupiah(transaction.amount_paid)}</span>
          </div>
          <div className="flex justify-between font-bold text-xs text-emerald-600">
            <span>Kembalian</span><span>{formatRupiah(transaction.change_amount)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <button className="btn-secondary flex items-center justify-center gap-1.5 text-xs"
          onClick={() => {
            if (printerNative() && getSavedPrinter()) {
              printThermal(transaction, settings ?? {}).catch(e => toast.error('Gagal cetak: ' + e.message))
            } else {
              printReceipt(transaction, settings ?? {})
            }
          }}>
          <Printer size={13} /> Cetak
        </button>
        <button className="btn-secondary flex items-center justify-center gap-1.5 text-xs"
          onClick={() => downloadPDF(transaction, settings ?? {})}>
          <FileDown size={13} /> Unduh
        </button>
        <button className="btn-secondary flex items-center justify-center gap-1.5 text-xs"
          onClick={() => shareReceipt(transaction, settings ?? {})}>
          <Share2 size={13} /> Bagikan
        </button>
      </div>
      <button className="btn-primary w-full mt-2 flex items-center justify-center gap-2" onClick={onClose}>
        <Sparkles size={15} /> Transaksi Baru
      </button>
    </Modal>
  )
}

// ── Panel Produk ──────────────────────────────────────────────────────────────
function ProductPanel({ products, categories, search, setSearch, activeCatId, setActiveCatId, onAdd, cartCount, cartTotal, onShowCart }) {
  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat    = !activeCatId || p.category_id === activeCatId
    return matchSearch && matchCat
  })

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Search */}
      <div className="mb-3 relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-10 text-sm bg-white dark:bg-gray-800"
          placeholder="Cari nama produk..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 flex-shrink-0 scrollbar-hide">
        <button
          onClick={() => setActiveCatId(null)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all
            ${!activeCatId
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-300 dark:shadow-blue-900/40'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-blue-300 hover:text-blue-600'
            }`}
        >
          Semua
        </button>
        {categories.map(cat => (
          <button key={cat.id}
            onClick={() => setActiveCatId(activeCatId === cat.id ? null : cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all
              ${activeCatId === cat.id
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-300 dark:shadow-blue-900/40'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-blue-300 hover:text-blue-600'
              }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Jumlah produk */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 flex-shrink-0">
        <span className="font-semibold text-gray-600 dark:text-gray-300">{filtered.length}</span> produk
        {search && <span className="ml-1">untuk "<em>{search}</em>"</span>}
      </p>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto pb-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Package size={24} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm">Produk tidak ditemukan</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 md:gap-3">
            {filtered.map(p => <ProductCard key={p.id} product={p} onAdd={onAdd} />)}
          </div>
        )}
      </div>

      {/* ── Cart FAB — mobile only ─────────────────── */}
      {cartCount > 0 && (
        <button
          onClick={onShowCart}
          className="lg:hidden mt-3 w-full relative overflow-hidden rounded-2xl font-bold text-sm flex items-center justify-between px-4 py-0
            bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white
            shadow-xl shadow-blue-300 dark:shadow-blue-900/50
            active:scale-95 transition-all duration-200"
          style={{ minHeight: 56 }}
        >
          {/* Shimmer layer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2.5s_ease-in-out_infinite]" />

          <div className="flex items-center gap-3 py-3 relative z-10">
            {/* Cart icon with badge */}
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <ShoppingCart size={18} className="text-white" />
              </div>
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-yellow-400 text-yellow-900 text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow">
                {cartCount}
              </span>
            </div>
            <div className="text-left">
              <div className="text-[10px] font-medium text-white/70 leading-none">Keranjang</div>
              <div className="text-sm font-bold text-white leading-tight">{cartCount} item</div>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10 py-3">
            <div className="text-right">
              <div className="text-[10px] font-medium text-white/70 leading-none">Total</div>
              <div className="text-base font-black text-white leading-tight">{formatRupiah(cartTotal)}</div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <ChevronRight size={16} className="text-white" />
            </div>
          </div>
        </button>
      )}
    </div>
  )
}

// ── QR Payment Modal (dipakai GoPay & QRIS) ──────────────────────────────────
const PAY_BRANDS = {
  gopay: {
    title: 'Pembayaran GoPay', Icon: Smartphone, header: 'from-green-500 to-emerald-600',
    scanText: 'Scan QR dengan app Gojek / GoPay', successNote: 'Dana GoPay diterima · struk siap dicetak',
    qrBox: 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30',
    imgBorder: 'border-green-200', scan: 'text-green-700 dark:text-green-400',
    spin: 'border-green-400/40 border-t-green-500', amount: 'text-green-600 dark:text-green-400',
  },
  qris: {
    title: 'Pembayaran QRIS', Icon: QrCode, header: 'from-blue-500 to-indigo-600',
    scanText: 'Scan dengan DANA · OVO · GoPay · ShopeePay · m-banking', successNote: 'Pembayaran diterima · struk siap dicetak',
    qrBox: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30',
    imgBorder: 'border-blue-200', scan: 'text-blue-700 dark:text-blue-400',
    spin: 'border-blue-400/40 border-t-blue-500', amount: 'text-blue-600 dark:text-blue-400',
  },
}

function QrPaymentModal({ isOpen, data, brand = 'gopay', statusFn, cancelFn, onSuccess, onCancel }) {
  const [status, setStatus]         = useState('pending')
  const [elapsed, setElapsed]       = useState(0)
  const [cancelling, setCancelling] = useState(false)
  const pollRef  = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!isOpen || !data) return
    setStatus('pending')
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    pollRef.current = setInterval(async () => {
      try {
        const { data: r } = await statusFn(data.order_id)
        if (r.transaction_status === 'settlement' || r.transaction_status === 'capture') {
          clearInterval(pollRef.current); clearInterval(timerRef.current)
          setStatus('settlement')
          setTimeout(() => onSuccess(r.transaction), 800)
        } else if (['cancel', 'deny', 'expire', 'failure'].includes(r.transaction_status)) {
          clearInterval(pollRef.current); clearInterval(timerRef.current)
          setStatus(r.transaction_status)
        }
      } catch (_) {}
    }, 3000)
    return () => { clearInterval(pollRef.current); clearInterval(timerRef.current) }
  }, [isOpen, data]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen || !data) return null

  const b    = PAY_BRANDS[brand] || PAY_BRANDS.gopay
  const Icon = b.Icon
  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const secs = String(elapsed % 60).padStart(2, '0')
  const FAILED     = ['cancel', 'deny', 'expire', 'failure']
  const FAIL_LABEL = { expire: 'Kadaluarsa', deny: 'Ditolak', cancel: 'Dibatalkan', failure: 'Gagal' }
  const isFailed   = FAILED.includes(status)

  async function handleCancel() {
    setCancelling(true)
    try { await cancelFn(data.order_id); onCancel() }
    catch (err) { toast.error(err.message) }
    finally { setCancelling(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className={`bg-gradient-to-r ${b.header} px-5 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Icon size={17} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">{b.title}</div>
              <div className="text-[11px] text-white/70">{data.order_id}</div>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-black/20 rounded-xl px-2.5 py-1">
            <Clock size={11} className="text-white/70" />
            <span className="text-xs font-mono font-bold text-white">{mins}:{secs}</span>
          </div>
        </div>

        <div className="p-5">
          {status === 'settlement' ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={36} className="text-green-500" />
              </div>
              <p className="font-bold text-gray-800 dark:text-gray-100">Pembayaran Berhasil!</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{b.successNote}</p>
            </div>
          ) : isFailed ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
                <XCircle size={36} className="text-red-500" />
              </div>
              <p className="font-bold text-gray-800 dark:text-gray-100">Pembayaran {FAIL_LABEL[status] || 'Gagal'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Pembayaran tidak selesai. Stok barang dikembalikan otomatis.</p>
              <button onClick={onCancel} className="mt-4 btn-secondary text-sm px-6">Tutup</button>
            </div>
          ) : (
            <>
              <div className={`${b.qrBox} rounded-2xl p-4 text-center mb-4 border`}>
                {data.qr_url ? (
                  <>
                    <img src={data.qr_url} alt="QR" className={`w-44 h-44 mx-auto rounded-xl bg-white border ${b.imgBorder} p-1.5 shadow-sm object-contain`} />
                    <p className={`text-xs ${b.scan} font-semibold mt-2`}>{b.scanText}</p>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6">
                    <div className={`w-10 h-10 border-2 ${b.spin} rounded-full animate-spin`} />
                    <p className="text-xs text-gray-500">Memuat QR Code...</p>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3 flex justify-between items-center mb-4 border border-gray-100 dark:border-gray-700">
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Tagihan</span>
                <span className={`font-black ${b.amount} text-lg`}>
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.gross_amount)}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-4">
                <RefreshCw size={12} className="animate-spin" />
                <span>Menunggu pembayaran...</span>
              </div>

              {data.deeplink && (
                <a href={data.deeplink} className={`block text-center text-xs ${b.scan} underline mb-3`}>Buka di app →</a>
              )}

              <button onClick={handleCancel} disabled={cancelling}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50">
                {cancelling ? 'Membatalkan...' : 'Batalkan Tagihan'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Panel Keranjang ───────────────────────────────────────────────────────────
function CartPanel({ cart, discount, setDiscount, paymentMethod, setPaymentMethod,
  amountPaid, setAmountPaid, onIncrease, onDecrease, onRemove, onClear,
  onCheckout, checkoutLoading, onBack, settings = {}, gopayError = '' }) {

  const subtotal   = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const grandTotal = Math.max(0, subtotal - Number(discount))
  const change     = Number(amountPaid) - grandTotal
  const isGoPay     = paymentMethod === 'gopay'
  const isQrisAuto  = paymentMethod === 'qris_auto'
  const isCharge    = isGoPay || isQrisAuto   // alur QR Midtrans: nominal & verifikasi otomatis
  const canCheckout = cart.length > 0 && (isCharge || Number(amountPaid) >= grandTotal)
  const isNonCash   = paymentMethod === 'qris' || paymentMethod === 'transfer' || isCharge
  const totalQty    = cart.reduce((s, i) => s + i.quantity, 0)

  useEffect(() => {
    if (isNonCash) setAmountPaid(String(grandTotal))
  }, [paymentMethod, grandTotal, isNonCash]) // eslint-disable-line react-hooks/exhaustive-deps

  const quickAmounts = grandTotal > 0 ? getQuickAmounts(grandTotal) : []

  return (
    <div className="flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden
      w-full lg:w-[22rem] lg:flex-shrink-0 h-full">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} className="lg:hidden p-1 -ml-1 rounded-lg hover:bg-white/20 text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <ShoppingCart size={16} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-none">Keranjang</div>
            {cart.length > 0 && (
              <div className="text-[11px] text-white/70 leading-none mt-0.5">{totalQty} item</div>
            )}
          </div>
        </div>
        {cart.length > 0 && (
          <button onClick={onClear}
            className="flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg">
            <X size={11} /> Kosongkan
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <ShoppingCart size={26} className="text-gray-300 dark:text-gray-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">Keranjang kosong</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">Ketuk produk untuk menambahkan</p>
            </div>
          </div>
        ) : (
          cart.map(item => (
            <CartItem key={item.product.id} item={item}
              onIncrease={onIncrease} onDecrease={onDecrease} onRemove={onRemove} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 dark:border-gray-800 p-3.5 space-y-3 flex-shrink-0">

        {/* Total */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl px-4 py-3 border border-blue-100 dark:border-blue-900/30">
          {subtotal !== grandTotal && (
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
              <span>Subtotal</span><span>{formatRupiah(subtotal)}</span>
            </div>
          )}
          {Number(discount) > 0 && (
            <div className="flex justify-between text-xs text-emerald-600 mb-1">
              <span>Diskon</span><span>-{formatRupiah(Number(discount))}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">Total</span>
            <span className="text-2xl font-black text-blue-700 dark:text-blue-400 tabular-nums">{formatRupiah(grandTotal)}</span>
          </div>
        </div>

        {/* Diskon */}
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3.5 py-2.5 border border-gray-100 dark:border-gray-700">
          <Tag size={13} className="text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 font-medium">Diskon</span>
          <input type="number" min="0"
            className="flex-1 bg-transparent text-sm text-right font-semibold text-gray-700 dark:text-gray-200 focus:outline-none min-w-0"
            value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" />
          <span className="text-xs text-gray-400 flex-shrink-0">Rp</span>
        </div>

        {/* Metode Pembayaran */}
        <div>
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-widest">Pembayaran</p>
          <div className="grid grid-cols-4 gap-1.5">
            {PAYMENT_METHODS.filter(m => m.val !== 'qris_auto' || settings.qris_enabled !== false).map(({ val, label, Icon, color }) => (
              <button key={val} onClick={() => setPaymentMethod(val)}
                className={`py-2.5 px-1 rounded-xl text-[11px] font-semibold transition-all flex flex-col items-center gap-1
                  ${paymentMethod === val
                    ? `${COLOR_ACTIVE[color]} shadow-md scale-[1.04]`
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-[1.02]'
                  }`}
              >
                <Icon size={15} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Info GoPay */}
        {paymentMethod === 'gopay' && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-100 dark:border-green-900/30">
            <div className="flex items-center gap-2 mb-1.5">
              <Smartphone size={14} className="text-green-600" />
              <p className="text-xs text-green-700 dark:text-green-400 font-semibold">Bayar via GoPay</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              QR Code akan muncul setelah klik <strong>Buat Tagihan GoPay</strong>.
              Pelanggan scan dengan app Gojek/GoPay.
            </p>
            {settings.midtrans_server_key ? null : (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 font-medium">
                ⚠ Midtrans Key belum diatur di Pengaturan &gt; GoPay.
              </p>
            )}
            {gopayError && (
              <div className="mt-2 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-2.5 py-2">
                <AlertCircle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-600 dark:text-red-400 leading-snug">{gopayError}</p>
              </div>
            )}
          </div>
        )}

        {/* Info QRIS Auto (nominal otomatis via Midtrans) */}
        {paymentMethod === 'qris_auto' && (
          <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-3 border border-cyan-100 dark:border-cyan-900/30">
            <div className="flex items-center gap-2 mb-1.5">
              <QrCode size={14} className="text-cyan-600" />
              <p className="text-xs text-cyan-700 dark:text-cyan-400 font-semibold">QRIS Otomatis</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              QR dinamis (nominal terisi otomatis) muncul setelah klik <strong>Buat QRIS</strong>.
              Terima <strong>DANA, OVO, GoPay, ShopeePay</strong> & m-banking — pembayaran <strong>terverifikasi otomatis</strong>.
            </p>
            {settings.midtrans_server_key ? null : (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 font-medium">
                ⚠ Midtrans Key belum diatur di Pengaturan &gt; GoPay.
              </p>
            )}
            {gopayError && (
              <div className="mt-2 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-2.5 py-2">
                <AlertCircle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-600 dark:text-red-400 leading-snug">{gopayError}</p>
              </div>
            )}
          </div>
        )}

        {/* Info QRIS */}
        {paymentMethod === 'qris' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center border border-blue-100 dark:border-blue-900/30">
            {settings.qris_image ? (
              <>
                <img src={getImageUrl(settings.qris_image)} alt="QRIS"
                  className="w-36 h-36 object-contain mx-auto rounded-xl bg-white border border-blue-200 p-1 shadow-sm" />
                <p className="text-xs text-blue-600 mt-2 font-semibold">Scan QRIS untuk membayar</p>
                <p className="text-sm font-black text-blue-700 mt-0.5">{formatRupiah(grandTotal)}</p>
                <div className="flex flex-wrap justify-center gap-1 mt-2">
                  {['DANA', 'OVO', 'GoPay', 'ShopeePay', 'LinkAja'].map(w => (
                    <span key={w} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-white/70 dark:bg-gray-800/60 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40">{w}</span>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Menerima semua e-wallet & m-banking QRIS</p>
              </>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400 py-2">
                Gambar QRIS belum diatur.<br />
                Upload di <span className="text-blue-600 font-medium">Pengaturan</span>.
              </p>
            )}
          </div>
        )}

        {/* Info Transfer */}
        {paymentMethod === 'transfer' && (
          <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 border border-violet-100 dark:border-violet-900/30">
            {settings.bank_name ? (
              <>
                <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold mb-2">Transfer ke rekening:</p>
                <p className="font-bold text-sm text-gray-800 dark:text-gray-100">{settings.bank_name}</p>
                <p className="font-mono text-lg font-black text-violet-700 dark:text-violet-400 tracking-wider">{settings.bank_account_number || '-'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">a.n. {settings.bank_account_name || '-'}</p>
              </>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400 py-1">
                Info rekening belum diatur.<br />
                Isi di <span className="text-violet-600 font-medium">Pengaturan</span>.
              </p>
            )}
          </div>
        )}

        {/* Input bayar (cash/card) */}
        {!isNonCash ? (
          <div className="space-y-2">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">Rp</span>
              <input type="number" min="0"
                className="input pl-9 text-sm font-mono"
                value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
                placeholder="Jumlah bayar..." />
            </div>
            {quickAmounts.length > 0 && (
              <div className="flex gap-1.5">
                {quickAmounts.map((n, i) => (
                  <button key={n} onClick={() => setAmountPaid(String(n))}
                    className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 truncate
                      ${Number(amountPaid) === n
                        ? i === 0 ? 'bg-emerald-500 text-white shadow-sm' : 'bg-blue-500 text-white shadow-sm'
                        : i === 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                  >
                    {i === 0 ? 'Pas' : formatShort(n)}
                  </button>
                ))}
              </div>
            )}
            {Number(amountPaid) > 0 && (
              <div className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex justify-between items-center
                ${change >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 border border-emerald-100 dark:border-emerald-900/30'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-100 dark:border-red-900/30'}`}>
                <span className="font-medium">{change >= 0 ? 'Kembalian' : 'Kurang'}</span>
                <span className="font-black text-sm">{formatRupiah(Math.abs(change))}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-4 py-3 flex items-center justify-between border border-emerald-100 dark:border-emerald-900/30">
            <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Jumlah Bayar</span>
            <span className="font-black text-emerald-700 dark:text-emerald-400">{formatRupiah(grandTotal)}</span>
          </div>
        )}

        {/* Tombol Checkout */}
        <button onClick={onCheckout}
          disabled={!canCheckout || checkoutLoading}
          className={`w-full py-4 rounded-2xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2
            ${canCheckout && !checkoutLoading
              ? isGoPay
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-300 dark:shadow-green-900/50 hover:from-green-600 hover:to-green-700 active:scale-[0.98]'
                : isQrisAuto
                  ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-lg shadow-cyan-300 dark:shadow-cyan-900/50 hover:from-cyan-600 hover:to-sky-700 active:scale-[0.98]'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-300 dark:shadow-blue-900/50 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98]'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
            }`}
        >
          {checkoutLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Memproses...
            </>
          ) : canCheckout ? (
            <>
              {isCharge ? (isQrisAuto ? <QrCode size={16} /> : <Smartphone size={16} />) : <CheckCircle size={16} />}
              {isGoPay ? `Buat Tagihan GoPay ${formatRupiah(grandTotal)}`
                : isQrisAuto ? `Buat QRIS ${formatRupiah(grandTotal)}`
                : `Bayar ${formatRupiah(grandTotal)}`}
            </>
          ) : (
            <>
              <ShoppingCart size={16} />
              {cart.length === 0 ? 'Keranjang kosong' : 'Lengkapi pembayaran'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Halaman Utama POS ─────────────────────────────────────────────────────────
export default function POS() {
  const [products, setProducts]           = useState([])
  const [categories, setCategories]       = useState([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [activeCatId, setActiveCatId]     = useState(null)
  const [cart, setCart]                   = useState([])
  const [discount, setDiscount]           = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid]       = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [receipt, setReceipt]             = useState(null)
  const [settings, setSettings]           = useState({})
  const [qrPay, setQrPay]                 = useState(null) // { data, brand, statusFn, cancelFn }
  const [gopayError, setGopayError]       = useState('')
  const [mobileTab, setMobileTab]         = useState('products')

  const fetchData = useCallback(async () => {
    try {
      const [{ data: prods }, { data: cats }, { data: stg }] = await Promise.all([
        getProducts(), getCategories(), getSettings(),
      ])
      setProducts(prods)
      setCategories(cats)
      setSettings(stg)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) { toast.error(`Stok ${product.name} hanya ${product.stock}`); return prev }
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  function increaseQty(productId) {
    setCart(prev => prev.map(i => {
      if (i.product.id !== productId) return i
      if (i.quantity >= i.product.stock) { toast.error('Stok tidak cukup'); return i }
      return { ...i, quantity: i.quantity + 1 }
    }))
  }

  function decreaseQty(productId) {
    setCart(prev => prev.map(i =>
      i.product.id === productId ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i
    ))
  }

  function removeFromCart(productId) {
    setCart(prev => prev.filter(i => i.product.id !== productId))
  }

  function clearCart() {
    setCart([]); setDiscount(0); setAmountPaid(''); setPaymentMethod('cash')
  }

  const subtotal   = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const grandTotal = Math.max(0, subtotal - Number(discount))
  const cartCount  = cart.reduce((s, i) => s + i.quantity, 0)

  async function handleCheckout() {
    if (cart.length === 0) { toast.error('Keranjang kosong'); return }

    // Alur QR Midtrans (GoPay / QRIS dinamis) — nominal & verifikasi otomatis
    if (paymentMethod === 'gopay' || paymentMethod === 'qris_auto') {
      const isQris = paymentMethod === 'qris_auto'
      setCheckoutLoading(true)
      setGopayError('')
      try {
        const payload = {
          items:    cart.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
          discount: Number(discount),
          tax:      0,
        }
        const { data } = isQris ? await qrisCharge(payload) : await gopayCharge(payload)
        clearCart()
        setMobileTab('products')
        fetchData()
        setQrPay(isQris
          ? { data: data.qris,  brand: 'qris',  statusFn: qrisStatus,  cancelFn: qrisCancel }
          : { data: data.gopay, brand: 'gopay', statusFn: gopayStatus, cancelFn: gopayCancel })
      } catch (err) {
        setGopayError(err.message)
        toast.error(err.message)
      } finally {
        setCheckoutLoading(false)
      }
      return
    }

    if (Number(amountPaid) < grandTotal) { toast.error('Pembayaran kurang'); return }
    setCheckoutLoading(true)
    try {
      const { data } = await createTransaction({
        items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
        payment_method: paymentMethod,
        amount_paid: Number(amountPaid),
        discount: Number(discount),
        tax: 0,
      })
      setReceipt(data)
      clearCart()
      setMobileTab('products')
      fetchData()
      toast.success(`Transaksi ${data.invoice_number} berhasil!`)
      maybeAutoPrint(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCheckoutLoading(false)
    }
  }

  // Cetak otomatis ke printer Bluetooth bila diaktifkan & printer terpilih
  function maybeAutoPrint(tx) {
    if (printerNative() && isAutoPrint() && getSavedPrinter()) {
      printThermal(tx, settings).catch(err => toast.error('Gagal cetak otomatis: ' + err.message))
    }
  }

  function handleQrSuccess(transaction) {
    setQrPay(null)
    setReceipt(transaction)
    fetchData()
    toast.success(`Transaksi ${transaction?.invoice_number} berhasil!`)
    maybeAutoPrint(transaction)
  }

  function handleQrCancel() {
    setQrPay(null)
    fetchData()
  }

  if (loading) return <FullPageSpinner />

  const cartProps = {
    cart, discount, setDiscount, paymentMethod,
    setPaymentMethod: m => { setGopayError(''); setPaymentMethod(m) },
    amountPaid, setAmountPaid,
    onIncrease: increaseQty, onDecrease: decreaseQty,
    onRemove: removeFromCart, onClear: clearCart,
    onCheckout: handleCheckout, checkoutLoading,
    onBack: () => setMobileTab('products'),
    settings, gopayError,
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:flex gap-4 h-[calc(100vh-88px)]">
        <ProductPanel
          products={products} categories={categories}
          search={search} setSearch={setSearch}
          activeCatId={activeCatId} setActiveCatId={setActiveCatId}
          onAdd={addToCart} cartCount={cartCount} cartTotal={grandTotal}
          onShowCart={() => {}}
        />
        <CartPanel {...cartProps} />
      </div>

      {/* Mobile */}
      <div className="lg:hidden flex flex-col h-[calc(100vh-64px)]">
        {mobileTab === 'products' ? (
          <ProductPanel
            products={products} categories={categories}
            search={search} setSearch={setSearch}
            activeCatId={activeCatId} setActiveCatId={setActiveCatId}
            onAdd={addToCart} cartCount={cartCount} cartTotal={grandTotal}
            onShowCart={() => setMobileTab('cart')}
          />
        ) : (
          <CartPanel {...cartProps} />
        )}
      </div>

      <ReceiptModal isOpen={!!receipt} transaction={receipt} settings={settings} onClose={() => setReceipt(null)} />
      <QrPaymentModal isOpen={!!qrPay} data={qrPay?.data} brand={qrPay?.brand}
        statusFn={qrPay?.statusFn} cancelFn={qrPay?.cancelFn}
        onSuccess={handleQrSuccess} onCancel={handleQrCancel} />
    </>
  )
}
