import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Search, AlertTriangle } from 'lucide-react'
import { getProducts, createProduct, updateProduct, deleteProduct, getCategories } from '../api'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import { FullPageSpinner } from '../components/ui/Spinner'

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

function ProductForm({ initial, categories, onSubmit, onClose }) {
  const [form, setForm] = useState({
    name:       initial?.name       || '',
    category_id:initial?.category_id|| '',
    price:      initial?.price      || '',
    stock:      initial?.stock      ?? '',
    sku:        initial?.sku        || '',
    image_url:  initial?.image_url  || '',
  })
  const [loading, setLoading] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit({
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        category_id: form.category_id || null,
      })
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk <span className="text-red-500">*</span></label>
          <input className="input" value={form.name} onChange={set('name')} required placeholder="Nama produk" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
          <select className="input" value={form.category_id} onChange={set('category_id')}>
            <option value="">-- Pilih --</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
          <input className="input" value={form.sku} onChange={set('sku')} placeholder="Kode produk" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Harga (Rp) <span className="text-red-500">*</span></label>
          <input className="input" type="number" min="0" value={form.price} onChange={set('price')} required placeholder="0" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stok <span className="text-red-500">*</span></label>
          <input className="input" type="number" min="0" value={form.stock} onChange={set('stock')} required placeholder="0" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">URL Gambar</label>
          <input className="input" value={form.image_url} onChange={set('image_url')} placeholder="https://..." />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Menyimpan...' : (initial ? 'Simpan Perubahan' : 'Tambah Produk')}
        </button>
      </div>
    </form>
  )
}

export default function Products() {
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterCat, setFilterCat]   = useState('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchAll = useCallback(async () => {
    try {
      const [{ data: prods }, { data: cats }] = await Promise.all([
        getProducts({ search, category_id: filterCat }),
        getCategories(),
      ])
      setProducts(prods)
      setCategories(cats)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, filterCat])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleCreate(values) {
    try { await createProduct(values); toast.success('Produk ditambahkan'); setModalOpen(false); fetchAll() }
    catch (err) { toast.error(err.message) }
  }
  async function handleUpdate(values) {
    try { await updateProduct(editTarget.id, values); toast.success('Produk diubah'); setEditTarget(null); fetchAll() }
    catch (err) { toast.error(err.message) }
  }
  async function handleDelete() {
    try { await deleteProduct(deleteTarget.id); toast.success('Produk dihapus'); fetchAll() }
    catch (err) { toast.error(err.message) }
  }

  const stockColor = s => s === 0 ? 'red' : s <= 5 ? 'yellow' : 'green'

  if (loading) return <FullPageSpinner />

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-800">Manajemen Produk</h2>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} produk ditemukan</p>
        </div>
        <button className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Tambah Produk
        </button>
      </div>

      {/* Filter — stack di mobile */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9 text-sm" placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm w-full sm:w-44" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Semua Kategori</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {products.length === 0 ? (
          <EmptyState
            title="Tidak ada produk"
            description="Tambahkan produk untuk mulai berjualan"
            action={<button className="btn-primary flex items-center gap-2" onClick={() => setModalOpen(true)}><Plus size={16}/> Tambah Produk</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 md:px-6 py-3 text-gray-600 font-medium">Produk</th>
                  <th className="text-left px-4 md:px-6 py-3 text-gray-600 font-medium hidden md:table-cell">Kategori</th>
                  <th className="text-left px-4 md:px-6 py-3 text-gray-600 font-medium hidden lg:table-cell">SKU</th>
                  <th className="text-right px-4 md:px-6 py-3 text-gray-600 font-medium">Harga</th>
                  <th className="text-center px-4 md:px-6 py-3 text-gray-600 font-medium">Stok</th>
                  <th className="px-4 md:px-6 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 md:px-6 py-3">
                      <div className="flex items-center gap-2 md:gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-9 h-9 md:w-10 md:h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0" onError={e => e.target.style.display='none'} />
                        ) : (
                          <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">IMG</div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate max-w-[140px] md:max-w-none">{p.name}</p>
                          {/* Kategori tampil di sini pada mobile */}
                          <p className="text-xs text-gray-400 md:hidden">{p.category_name || 'Tanpa Kategori'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 text-gray-500 hidden md:table-cell">{p.category_name || '-'}</td>
                    <td className="px-4 md:px-6 py-3 text-gray-500 font-mono text-xs hidden lg:table-cell">{p.sku || '-'}</td>
                    <td className="px-4 md:px-6 py-3 text-right font-medium text-gray-800 whitespace-nowrap">{formatRupiah(p.price)}</td>
                    <td className="px-4 md:px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {p.stock <= 5 && p.stock > 0 && <AlertTriangle size={12} className="text-yellow-500" />}
                        <Badge color={stockColor(p.stock)}>{p.stock}</Badge>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" onClick={() => setEditTarget(p)}><Pencil size={14}/></button>
                        <button className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" onClick={() => setDeleteTarget(p)}><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Produk" size="lg">
        <ProductForm categories={categories} onSubmit={handleCreate} onClose={() => setModalOpen(false)} />
      </Modal>
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Produk" size="lg">
        {editTarget && <ProductForm initial={editTarget} categories={categories} onSubmit={handleUpdate} onClose={() => setEditTarget(null)} />}
      </Modal>
      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Hapus Produk" message={`Yakin ingin menghapus produk "${deleteTarget?.name}"?`}
      />
    </div>
  )
}
