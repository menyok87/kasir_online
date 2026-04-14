import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, CheckCircle, Tag, ArrowLeft } from 'lucide-react'
import { getProducts, getCategories, createTransaction, getSettings } from '../api'
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
          src={product.image_url}
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
    <div className="flex items-center gap-2 py-3 border-b border-gray-100">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 leading-tight">{item.product.name}</p>
        <p className="text-xs text-blue-600 font-medium mt-0.5">{formatRupiah(item.product.price)}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onDecrease(item.product.id)}
          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
        >
          <Minus size={13} />
        </button>
        <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
        <button
          onClick={() => onIncrease(item.product.id)}
          disabled={item.quantity >= item.product.stock}
          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center disabled:opacity-40"
        >
          <Plus size={13} />
        </button>
      </div>
      <span className="text-sm font-semibold text-gray-700 w-16 text-right flex-shrink-0">
        {formatRupiah(item.product.price * item.quantity)}
      </span>
      <button onClick={() => onRemove(item.product.id)} className="p-1 text-red-400 hover:text-red-600">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ── Modal Struk ───────────────────────────────────────────────────────────────
function ReceiptModal({ isOpen, transaction, onClose }) {
  if (!transaction) return null
  const paymentLabel = { cash: 'Tunai', transfer: 'Transfer', card: 'Kartu' }

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
          onClick={() => printReceipt(transaction, settings)}
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
          className="lg:hidden mt-3 w-full btn-primary py-3 flex items-center justify-center gap-2 relative"
        >
          <ShoppingCart size={18} />
          <span>Lihat Keranjang</span>
          <span className="ml-1 bg-white text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">
            {cartCount}
          </span>
        </button>
      )}
    </div>
  )
}

// ── Panel Keranjang ───────────────────────────────────────────────────────────
function CartPanel({ cart, discount, setDiscount, paymentMethod, setPaymentMethod,
  amountPaid, setAmountPaid, onIncrease, onDecrease, onRemove, onClear,
  onCheckout, checkoutLoading, onBack }) {

  const subtotal   = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const grandTotal = Math.max(0, subtotal - Number(discount))
  const change     = Number(amountPaid) - grandTotal
  const canCheckout = cart.length > 0 && Number(amountPaid) >= grandTotal

  return (
    <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden
      w-full lg:w-80 lg:flex-shrink-0 h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {/* Tombol kembali — mobile only */}
          <button onClick={onBack} className="lg:hidden p-1 -ml-1 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <ShoppingCart size={18} className="text-blue-600" />
          <span className="font-semibold text-gray-800 text-sm">Keranjang</span>
          {cart.length > 0 && (
            <Badge color="blue">{cart.reduce((s, i) => s + i.quantity, 0)}</Badge>
          )}
        </div>
        {cart.length > 0 && (
          <button onClick={onClear} className="text-xs text-red-500 hover:text-red-700">Kosongkan</button>
        )}
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto px-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
            <ShoppingCart size={36} className="mb-2 text-gray-300" />
            <p className="text-sm">Keranjang kosong</p>
            <p className="text-xs mt-1">Klik produk untuk menambahkan</p>
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

      {/* Summary & Checkout */}
      <div className="border-t border-gray-200 p-3 space-y-3">
        {/* Diskon */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 w-20 flex-shrink-0">Diskon (Rp)</label>
          <input
            type="number" min="0"
            className="input text-sm py-1.5"
            value={discount}
            onChange={e => setDiscount(e.target.value)}
            placeholder="0"
          />
        </div>

        {/* Subtotal & Total */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span><span>{formatRupiah(subtotal)}</span>
          </div>
          {Number(discount) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Diskon</span><span>- {formatRupiah(Number(discount))}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-1.5">
            <span>Total</span>
            <span className="text-blue-700">{formatRupiah(grandTotal)}</span>
          </div>
        </div>

        {/* Metode Pembayaran */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Metode Pembayaran</p>
          <div className="grid grid-cols-3 gap-1">
            {[['cash', 'Tunai'], ['transfer', 'Transfer'], ['card', 'Kartu']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setPaymentMethod(val)}
                className={`py-2 rounded-lg text-xs font-medium transition-colors
                  ${paymentMethod === val ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Uang Bayar */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Uang Dibayar (Rp)</label>
          <input
            type="number" min="0"
            className="input text-sm"
            value={amountPaid}
            onChange={e => setAmountPaid(e.target.value)}
            placeholder="Masukkan jumlah..."
          />
          {Number(amountPaid) > 0 && (
            <p className={`text-xs mt-1 font-medium ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {change >= 0 ? `Kembalian: ${formatRupiah(change)}` : `Kurang: ${formatRupiah(Math.abs(change))}`}
            </p>
          )}
        </div>

        {/* Tombol Checkout */}
        <button
          onClick={onCheckout}
          disabled={!canCheckout || checkoutLoading}
          className="btn-primary w-full py-3 text-sm md:text-base font-semibold"
        >
          {checkoutLoading ? 'Memproses...' : `Bayar ${formatRupiah(grandTotal)}`}
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
        onClose={() => setReceipt(null)}
      />
    </>
  )
}
