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
    try {
      await onSubmit({ name: name.trim() })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kategori</label>
        <input
          className="input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Contoh: Makanan, Minuman..."
          autoFocus
          required
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Kategori Produk</h2>
          <p className="text-sm text-gray-500 mt-1">{categories.length} kategori terdaftar</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Tambah Kategori
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {categories.length === 0 ? (
          <EmptyState
            title="Belum ada kategori"
            description="Tambahkan kategori untuk mengelompokkan produk Anda"
            action={<button className="btn-primary flex items-center gap-2" onClick={() => setModalOpen(true)}><Plus size={16}/> Tambah</button>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Nama Kategori</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Dibuat</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-800">{cat.name}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(cat.created_at).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                        onClick={() => setEditTarget(cat)}
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                        onClick={() => setDeleteTarget(cat)}
                        title="Hapus"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Tambah */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Kategori">
        <CategoryForm onSubmit={handleCreate} onClose={() => setModalOpen(false)} />
      </Modal>

      {/* Modal Edit */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Kategori">
        {editTarget && (
          <CategoryForm
            initial={editTarget}
            onSubmit={handleUpdate}
            onClose={() => setEditTarget(null)}
          />
        )}
      </Modal>

      {/* Dialog Konfirmasi Hapus */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Kategori"
        message={`Yakin ingin menghapus kategori "${deleteTarget?.name}"? Kategori tidak bisa dihapus jika masih memiliki produk aktif.`}
      />
    </div>
  )
}
