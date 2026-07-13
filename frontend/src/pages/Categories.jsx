import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import { FullPageSpinner } from '../components/ui/Spinner'

function CategoryForm({ initial, onSubmit, onClose }) {
  const [name, setName] = useState(initial?.name || '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try { await onSubmit({ name: name.trim() }) }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nama Kategori</label>
        <input
          className="input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Contoh: Makanan, Minuman..."
          autoFocus required
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
        <button type="submit" className="btn-primary" disabled={loading || !name.trim()}>
          {loading ? 'Menyimpan...' : (initial ? 'Simpan Perubahan' : 'Tambah Kategori')}
        </button>
      </div>
    </form>
  )
}

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await getCategories()
      setCategories(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  async function handleCreate(values) {
    try {
      await createCategory(values)
      toast.success('Kategori berhasil ditambahkan')
      setModalOpen(false)
      fetchCategories()
    } catch (err) { toast.error(err.message) }
  }

  async function handleUpdate(values) {
    try {
      await updateCategory(editTarget.id, values)
      toast.success('Kategori berhasil diubah')
      setEditTarget(null)
      fetchCategories()
    } catch (err) { toast.error(err.message) }
  }

  async function handleDelete() {
    try {
      await deleteCategory(deleteTarget.id)
      toast.success('Kategori berhasil dihapus')
      fetchCategories()
    } catch (err) { toast.error(err.message) }
  }

  if (loading) return <FullPageSpinner />

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-100">Kategori Produk</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{categories.length} kategori terdaftar</p>
        </div>
        <button className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Tambah Kategori
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {categories.length === 0 ? (
          <EmptyState
            title="Belum ada kategori"
            description="Tambahkan kategori untuk mengelompokkan produk"
            action={
              <button className="btn-primary flex items-center gap-2" onClick={() => setModalOpen(true)}>
                <Plus size={16} /> Tambah
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[360px]">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 md:px-6 py-3 text-gray-600 dark:text-gray-400 font-medium">Nama Kategori</th>
                  <th className="text-left px-4 md:px-6 py-3 text-gray-600 dark:text-gray-400 font-medium hidden sm:table-cell">Dibuat</th>
                  <th className="px-4 md:px-6 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {categories.map(cat => (
                  <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 md:px-6 py-3 font-medium text-gray-800 dark:text-gray-100">{cat.name}</td>
                    <td className="px-4 md:px-6 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      {new Date(cat.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 md:px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600"
                          onClick={() => setEditTarget(cat)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600"
                          onClick={() => setDeleteTarget(cat)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Kategori">
        <CategoryForm onSubmit={handleCreate} onClose={() => setModalOpen(false)} />
      </Modal>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Kategori">
        {editTarget && (
          <CategoryForm initial={editTarget} onSubmit={handleUpdate} onClose={() => setEditTarget(null)} />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Hapus Kategori"
        message={`Yakin ingin menghapus kategori "${deleteTarget?.name}"? Tidak bisa dihapus jika masih ada produk aktif.`}
      />
    </div>
  )
}
