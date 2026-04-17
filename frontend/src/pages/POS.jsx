import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, CheckCircle, Tag, ArrowLeft } from 'lucide-react'
import { getProducts, getCategories, createTransaction, getSettings } from '../api'
import { getImageUrl } from '../utils/getImageUrl'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import { FullPageSpinner } from '../components/ui/Spinner'
import { printReceipt } from '../utils/printReceipt'

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

// ── Kartu Produk ─────────────────────────────────────────────────────────────
function ProductCard({ product, onAdd }) {
  const outOfStock = product.stock === 0
  return (
    <button
      onClick={() => !outOfStock && onAdd(product)}
      disabled={outOfStock}
      className={`bg-white rounded-xl border p-2.5 text-left transition-all w-full
        ${outOfStock
          ? 'opacity-50 cursor-not-allowed border-gray-200'
          : 'border-gray-200 hover:border-blue-400 hover:shadow-md active:scale-95'
        }`}
    >
      {product.image_url ? (
        <img
          src={getImageUrl(product.image_url)}
          alt={product.name}
          className="w-full h-20 md:h-28 object-cover rounded-lg mb-2 bg-gray-100"
          onError={e => { e.target.style.display = 'none' }}
        />
      ) : (
        <div className="w-full h-20 md:h-28 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-2">
          <Tag size={22} className="text-blue-300" />
        </div>
      )}
      <p className="text-xs font-medium text-gray-800 leading-tight line-clamp-2 mb-1">{product.name}</p>
      <p className="text-xs md:text-sm font-bold text-blue-600">{formatRupiah(product.price)}</p>
      <div className="mt-1">
        <Badge color={product.stock === 0 ? 'red' : product.stock <= 5 ? 'yellow' : 'green'}>
          {product.stock === 0 ? 'Habis' : `Stok: ${product.stock}`}
        </Badge>
      </div>
    </button>
  )
}

// ── Item Keranjang ────────────────────────────────────────────────────────────
function CartItem({ item, onIncrease, onDecrease, onRemove }) {
  return (
    <div className="flex items-center gap-2.5 py-2.5 border-b border-gray-100 group">
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100">
        {item.product.image_url ? (
          <img
            src={getImageUrl(item.product.image_url)}
            alt={item.product.name}
            className="w-full h-full object-cover"
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Tag size={14} className="text-blue-300" />
          </div>
        )}
      </div>

      {/* Nama & harga */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 leading-tight truncate">{item.product.name}</p>
        <p className="text-xs text-blue-500 mt-0.5">{formatRupiah(item.product.price)}</p>
      </div>

      {/* Qty controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onDecrease(item.product.id)}
          className="w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors"
        >
          <Minus size={10} />
        </button>
        <span className="w-6 text-center text-sm font-bold text-gray-700">{item.quantity}</span>
        <button
          onClick={() => onIncrease(item.product.id)}
          disabled={item.quantity >= item.product.stock}
          className="w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 flex items-center justify-center transition-colors disabled:opacity-40"
        >
          <Plus size={10} />
        </button>
      </div>

      {/* Subtotal + hapus */}
      <div className="text-right flex-shrink-0 min-w-[56px]">
        <p className="text-sm font-bold text-gray-700">{formatRupiah(item.product.price * item.quantity)}</p>
        <button
          onClick={() => onRemove(item.product.id)}
          className="text-xs text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
        >
          hapus
        </button>
      </div>
    </div>
  )
}

// ── Modal Struk ───────────────────────────────────────────────────────────────
function ReceiptModal({ isOpen, transaction, settings, onClose }) {
  if (!transaction) return null
  const paymentLabel = { cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer', card: 'Kartu' }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transaksi Berhasil" size="sm">
      <div className="text-center mb-4">
        <CheckCircle size={40} className="text-green-500 mx-auto mb-2" />
        <p className="font-semibold text-gray-800">{transaction.invoice_number}</p>
        <p className="text-sm text-gray-500">Pembayaran berhasil diproses</p>
      </div>

      <div className="border border-dashed border-gray-300 rounded-xl p-4 text-sm space-y-2 bg-gray-50">
        <div className="space-y-1">
          {transaction.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-gray-700">{item.product_name} <span className="text-gray-400">×{item.quantity}</span></span>
              <span className="font-medium">{formatRupiah(item.subtotal)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-dashed border-gray-300 pt-2 space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Subtotal</span><span>{formatRupiah(transaction.subtotal)}</span>
          </div>
          {transaction.discount > 0 && (
            <div className="flex justify-between text-xs text-green-600">
              <span>Diskon</span><span>- {formatRupiah(transaction.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span>Total</span><span className="text-blue-700">{formatRupiah(transaction.grand_total)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Bayar ({paymentLabel[transaction.payment_method]})</span>
            <span>{formatRupiah(transaction.amount_paid)}</span>
          </div>
          <div className="flex justify-between font-bold text-green-600">
            <span>Kembalian</span><span>{formatRupiah(transaction.change_amount)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          className="btn-secondary flex-1 flex items-center justify-center gap-2"
          onClick={() => printReceipt(transaction, settings ?? {})}
        >
          <Printer size={15} /> Cetak Struk
        </button>
        <button className="btn-primary flex-1" onClick={onClose}>
          Transaksi Baru
        </button>
      </div>
    </Modal>
  )
}

// ── Panel Produk ──────────────────────────────────────────────────────────────
function ProductPanel({ products, categories, search, setSearch, activeCatId, setActiveCatId, onAdd, cartCount, onShowCart }) {
  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat    = !activeCatId || p.category_id === activeCatId
    return matchSearch && matchCat
  })

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Search */}
      <div className="mb-2 relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9 text-sm"
          placeholder="Cari produk..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 flex-shrink-0 scrollbar-hide">
        <button
          onClick={() => setActiveCatId(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors
            ${!activeCatId ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Semua
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCatId(activeCatId === cat.id ? null : cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors
              ${activeCatId === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            Tidak ada produk ditemukan
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 md:gap-3">
            {filtered.map(p => (
              <ProductCard key={p.id} product={p} onAdd={onAdd} />
            ))}
          </div>
        )}
      </div>

      {/* Tombol lihat keranjang — mobile only */}
      {cartCount > 0 && (
        <button
          onClick={onShowCart}
          className="lg:hidden mt-3 w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-between px-4
            bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} />
            <span>Lihat Keranjang</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {cartCount} item
            </span>
            <span className="text-white/80">›</span>
          </div>
        </button>
      )}
    </div>
  )
}

// ── Panel Keranjang ───────────────────────────────────────────────────────────
function CartPanel({ cart, discount, setDiscount, paymentMethod, setPaymentMethod,
  amountPaid, setAmountPaid, onIncrease, onDecrease, onRemove, onClear,
  onCheckout, checkoutLoading, onBack, settings = {} }) {

  const subtotal   = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const grandTotal = Math.max(0, subtotal - Number(discount))
  const change     = Number(amountPaid) - grandTotal
  const canCheckout = cart.length > 0 && Number(amountPaid) >= grandTotal
  const isNonCash  = paymentMethod === 'qris' || paymentMethod === 'transfer'

  // Auto-fill jumlah bayar untuk QRIS dan Transfer
  useEffect(() => {
    if (isNonCash) setAmountPaid(String(grandTotal))
  }, [paymentMethod, grandTotal]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden
      w-full lg:w-80 lg:flex-shrink-0 h-full">

      {/* Header — gradient biru */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="lg:hidden p-1 -ml-1 rounded-lg hover:bg-blue-500 text-white/80 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <ShoppingCart size={17} className="text-white" />
          <span className="font-semibold text-white text-sm">Keranjang</span>
          {cart.length > 0 && (
            <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {cart.reduce((s, i) => s + i.quantity, 0)} item
            </span>
          )}
        </div>
        {cart.length > 0 && (
          <button onClick={onClear} className="text-xs text-white/60 hover:text-white transition-colors">
            Kosongkan
          </button>
        )}
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto px-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <ShoppingCart size={28} className="text-gray-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-400">Keranjang kosong</p>
              <p className="text-xs text-gray-300 mt-0.5">Ketuk produk untuk menambahkan</p>
            </div>
          </div>
        ) : (
          cart.map(item => (
            <CartItem
              key={item.product.id}
              item={item}
              onIncrease={onIncrease}
              onDecrease={onDecrease}
              onRemove={onRemove}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 p-3 space-y-2.5 flex-shrink-0">
        {/* Diskon */}
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
          <Tag size={12} className="text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-400 flex-shrink-0">Diskon</span>
          <input
            type="number" min="0"
            className="flex-1 bg-transparent text-sm text-right font-medium text-gray-700 focus:outline-none min-w-0"
            value={discount}
            onChange={e => setDiscount(e.target.value)}
            placeholder="0"
          />
          <span className="text-xs text-gray-400 flex-shrink-0">Rp</span>
        </div>

        {/* Total card */}
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
          {subtotal !== grandTotal && (
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Subtotal</span><span>{formatRupiah(subtotal)}</span>
            </div>
          )}
          {Number(discount) > 0 && (
            <div className="flex justify-between text-xs text-green-600 mb-1">
              <span>Diskon</span><span>- {formatRupiah(Number(discount))}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-blue-700">Total</span>
            <span className="text-xl font-bold text-blue-700">{formatRupiah(grandTotal)}</span>
          </div>
        </div>

        {/* Metode Pembayaran */}
        <div>
          <p className="text-xs text-gray-400 mb-1.5 font-medium">Metode Pembayaran</p>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { val: 'cash',     label: 'Tunai',  emoji: '💵' },
              { val: 'qris',     label: 'QRIS',   emoji: '📷' },
              { val: 'transfer', label: 'Bank',   emoji: '🏦' },
              { val: 'card',     label: 'Kartu',  emoji: '💳' },
            ].map(({ val, label, emoji }) => (
              <button
                key={val}
                onClick={() => setPaymentMethod(val)}
                className={`py-2 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-0.5
                  ${paymentMethod === val
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <span className="text-sm leading-none">{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Info QRIS */}
        {paymentMethod === 'qris' && (
          <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
            {settings.qris_image ? (
              <>
                <img
                  src={getImageUrl(settings.qris_image)}
                  alt="QRIS"
                  className="w-40 h-40 object-contain mx-auto rounded-lg bg-white border border-blue-200 p-1"
                />
                <p className="text-xs text-blue-600 mt-2 font-medium">Scan QRIS untuk membayar</p>
                <p className="text-sm font-bold text-blue-700 mt-0.5">{formatRupiah(grandTotal)}</p>
              </>
            ) : (
              <p className="text-xs text-gray-500 py-2">
                Gambar QRIS belum diatur.<br />
                Upload di <span className="text-blue-600 font-medium">Pengaturan Toko</span>.
              </p>
            )}
          </div>
        )}

        {/* Info Transfer Bank */}
        {paymentMethod === 'transfer' && (
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            {settings.bank_name ? (
              <>
                <p className="text-xs text-blue-600 font-medium mb-1.5">Transfer ke rekening:</p>
                <p className="font-semibold text-sm text-gray-800">{settings.bank_name}</p>
                <p className="font-mono text-lg font-bold text-blue-700 tracking-wide">{settings.bank_account_number || '-'}</p>
                <p className="text-xs text-gray-600">a.n. {settings.bank_account_name || '-'}</p>
                {settings.bank_branch && <p className="text-xs text-gray-400 mt-0.5">{settings.bank_branch}</p>}
              </>
            ) : (
              <p className="text-xs text-gray-500 py-1">
                Info rekening belum diatur.<br />
                Isi di <span className="text-blue-600 font-medium">Pengaturan Toko</span>.
              </p>
            )}
          </div>
        )}

        {/* Uang Bayar */}
        {!isNonCash ? (
          <div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Rp</span>
              <input
                type="number" min="0"
                className="input pl-9 text-sm font-mono"
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                placeholder="Uang dibayar..."
              />
            </div>
            {Number(amountPaid) > 0 && (
              <div className={`mt-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex justify-between
                ${change >= 0 ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                <span>{change >= 0 ? 'Kembalian' : 'Kurang'}</span>
                <span className="font-bold">{formatRupiah(Math.abs(change))}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-green-50 rounded-xl px-3 py-2.5 flex items-center justify-between border border-green-100">
            <span className="text-sm text-gray-600">Jumlah Bayar</span>
            <span className="font-bold text-green-700">{formatRupiah(grandTotal)}</span>
          </div>
        )}

        {/* Tombol Checkout */}
        <button
          onClick={onCheckout}
          disabled={!canCheckout || checkoutLoading}
          className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2
            ${canCheckout && !checkoutLoading
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md hover:from-blue-700 hover:to-blue-800 active:scale-95'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
        >
          {checkoutLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Memproses...
            </>
          ) : (
            `${canCheckout ? '✓' : '🛒'} Bayar ${formatRupiah(grandTotal)}`
          )}
        </button>
      </div>
    </div>
  )
}

// ── Halaman Utama POS ─────────────────────────────────────────────────────────
export default function POS() {
  const [products, setProducts]       = useState([])
  const [categories, setCategories]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [activeCatId, setActiveCatId] = useState(null)
  const [cart, setCart]               = useState([])
  const [discount, setDiscount]       = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid]   = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [receipt, setReceipt]         = useState(null)
  const [settings, setSettings]       = useState({})
  // Mobile: 'products' | 'cart'
  const [mobileTab, setMobileTab]     = useState('products')

  const fetchData = useCallback(async () => {
    try {
      const [{ data: prods }, { data: cats }, { data: stg }] = await Promise.all([
        getProducts(),
        getCategories(),
        getSettings(),
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
        if (existing.quantity >= product.stock) {
          toast.error(`Stok ${product.name} hanya ${product.stock}`)
          return prev
        }
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
    setCart([])
    setDiscount(0)
    setAmountPaid('')
    setPaymentMethod('cash')
  }

  const subtotal   = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const grandTotal = Math.max(0, subtotal - Number(discount))

  async function handleCheckout() {
    if (cart.length === 0) { toast.error('Keranjang kosong'); return }
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
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCheckoutLoading(false)
    }
  }

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  if (loading) return <FullPageSpinner />

  const cartProps = {
    cart, discount, setDiscount, paymentMethod, setPaymentMethod,
    amountPaid, setAmountPaid,
    onIncrease: increaseQty, onDecrease: decreaseQty,
    onRemove: removeFromCart, onClear: clearCart,
    onCheckout: handleCheckout, checkoutLoading,
    onBack: () => setMobileTab('products'),
    settings,
  }

  return (
    <>
      {/* ── Desktop: dua kolom berdampingan ── */}
      <div className="hidden lg:flex gap-5 h-[calc(100vh-88px)]">
        <ProductPanel
          products={products} categories={categories}
          search={search} setSearch={setSearch}
          activeCatId={activeCatId} setActiveCatId={setActiveCatId}
          onAdd={addToCart} cartCount={cartCount} onShowCart={() => {}}
        />
        <CartPanel {...cartProps} />
      </div>

      {/* ── Mobile: satu panel aktif dalam satu layar ── */}
      <div className="lg:hidden flex flex-col h-[calc(100vh-64px)]">
        {mobileTab === 'products' ? (
          <ProductPanel
            products={products} categories={categories}
            search={search} setSearch={setSearch}
            activeCatId={activeCatId} setActiveCatId={setActiveCatId}
            onAdd={addToCart} cartCount={cartCount}
            onShowCart={() => setMobileTab('cart')}
          />
        ) : (
          <CartPanel {...cartProps} />
        )}
      </div>

      <ReceiptModal
        isOpen={!!receipt}
        transaction={receipt}
        settings={settings}
        onClose={() => setReceipt(null)}
      />
    </>
  )
}
