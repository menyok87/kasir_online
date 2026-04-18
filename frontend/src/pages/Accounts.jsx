import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, BookOpen, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../api'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Badge from '../components/ui/Badge'
import { FullPageSpinner } from '../components/ui/Spinner'

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
}

const TYPE_CONFIG = {
  kas:        { label: 'Kas',         color: 'blue',   group: 'Aset',        side: 'debit' },
  bank:       { label: 'Bank',        color: 'blue',   group: 'Aset',        side: 'debit' },
  piutang:    { label: 'Piutang',     color: 'teal',   group: 'Aset',        side: 'debit' },
  hutang:     { label: 'Hutang',      color: 'red',    group: 'Kewajiban',   side: 'kredit' },
  modal:      { label: 'Modal',       color: 'purple', group: 'Modal',       side: 'kredit' },
  pendapatan: { label: 'Pendapatan',  color: 'green',  group: 'Pendapatan',  side: 'kredit' },
  beban:      { label: 'Beban',       color: 'yellow', group: 'Beban',       side: 'debit' },
}

const TYPE_OPTIONS = Object.entries(TYPE_CONFIG).map(([value, { label, group }]) => ({ value, label: `${label} (${group})` }))

const GROUP_ORDER = ['Aset', 'Kewajiban', 'Modal', 'Pendapatan', 'Beban']

function groupAccounts(accounts) {
  const grouped = {}
  for (const acc of accounts) {
    const group = TYPE_CONFIG[acc.type]?.group || 'Lainnya'
    if (!grouped[group]) grouped[group] = []
    grouped[group].push(acc)
  }
  return GROUP_ORDER.filter(g => grouped[g]).map(g => ({ group: g, items: grouped[g] }))
}

// ── Form ──────────────────────────────────────────────────────────────────────
function AccountForm({ initial, onSubmit, onClose }) {
  const [form, setForm] = useState({
    code:        initial?.code        || '',
    name:        initial?.name        || '',
    type:        initial?.type        || 'kas',
    balance:     initial?.balance     ?? '',
    description: initial?.description || '',
  })
  const [loading, setLoading] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit({ ...form, balance: Number(form.balance) || 0 })
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Kode Akun <span className="text-red-500">*</span>
          </label>
          <input
            className="input font-mono"
            value={form.code}
            onChange={set('code')}
            required
            placeholder="1-1001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Tipe <span className="text-red-500">*</span>
          </label>
          <select className="input" value={form.type} onChange={set('type')}>
            {TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          Nama Akun <span className="text-red-500">*</span>
        </label>
        <input
          className="input"
          value={form.name}
          onChange={set('name')}
          required
          placeholder="Contoh: Kas Tunai, Bank BCA, Beban Gaji"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          Saldo {initial ? 'Saat Ini' : 'Awal'} (Rp)
        </label>
        <input
          className="input"
          type="number"
          min="0"
          value={form.balance}
          onChange={set('balance')}
          placeholder="0"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Keterangan</label>
        <input
          className="input"
          value={form.description}
          onChange={set('description')}
          placeholder="Deskripsi singkat akun (opsional)"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Menyimpan...' : (initial ? 'Simpan Perubahan' : 'Tambah Akun')}
        </button>
      </div>
    </form>
  )
}

// ── Halaman Utama ──────────────────────────────────────────────────────────────
export default function Accounts() {
  const [accounts, setAccounts]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [modalOpen, setModalOpen]     = useState(false)
  const [editTarget, setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchAccounts = useCallback(async () => {
    try {
      const { data } = await getAccounts()
      setAccounts(data)
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  async function handleCreate(values) {
    try {
      await createAccount(values)
      toast.success('Akun berhasil ditambahkan')
      setModalOpen(false)
      fetchAccounts()
    } catch (err) { toast.error(err.message) }
  }

  async function handleUpdate(values) {
    try {
      await updateAccount(editTarget.id, values)
      toast.success('Akun berhasil diperbarui')
      setEditTarget(null)
      fetchAccounts()
    } catch (err) { toast.error(err.message) }
  }

  async function handleDelete() {
    try {
      await deleteAccount(deleteTarget.id)
      toast.success('Akun berhasil dihapus')
      fetchAccounts()
    } catch (err) { toast.error(err.message) }
  }

  // Kalkulasi ringkasan
  const totalAset       = accounts.filter(a => ['kas','bank','piutang'].includes(a.type)).reduce((s, a) => s + Number(a.balance), 0)
  const totalKewajiban  = accounts.filter(a => a.type === 'hutang').reduce((s, a) => s + Number(a.balance), 0)
  const totalModal      = accounts.filter(a => a.type === 'modal').reduce((s, a) => s + Number(a.balance), 0)
  const totalPendapatan = accounts.filter(a => a.type === 'pendapatan').reduce((s, a) => s + Number(a.balance), 0)
  const totalBeban      = accounts.filter(a => a.type === 'beban').reduce((s, a) => s + Number(a.balance), 0)
  const labaBersih      = totalPendapatan - totalBeban
  const grouped         = groupAccounts(accounts)

  if (loading) return <FullPageSpinner />

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-100">Daftar Akun</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{accounts.length} akun terdaftar</p>
        </div>
        <button
          className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
          onClick={() => setModalOpen(true)}
        >
          <Plus size={16} /> Tambah Akun
        </button>
      </div>

      {/* Ringkasan keuangan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="card p-4 col-span-2 sm:col-span-1 bg-blue-50 dark:bg-blue-900/20 border-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Aset</p>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-400 mt-1">{formatRupiah(totalAset)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Kas + Bank + Piutang</p>
        </div>
        <div className="card p-4 bg-red-50 dark:bg-red-900/20 border-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Kewajiban</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{formatRupiah(totalKewajiban)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Hutang</p>
        </div>
        <div className="card p-4 bg-purple-50 dark:bg-purple-900/20 border-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Modal Bersih</p>
          <p className="text-xl font-bold text-purple-700 dark:text-purple-400 mt-1">{formatRupiah(totalAset - totalKewajiban)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Aset − Kewajiban</p>
        </div>
        <div className={`card p-4 border-0 ${labaBersih >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Laba / Rugi</p>
          <p className={`text-xl font-bold mt-1 ${labaBersih >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {labaBersih >= 0 ? '+' : ''}{formatRupiah(labaBersih)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Pendapatan − Beban</p>
        </div>
      </div>

      {/* Tabel akun per kelompok */}
      {accounts.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
          <BookOpen size={40} className="mb-3 opacity-30" />
          <p className="font-medium">Belum ada akun</p>
          <p className="text-sm mt-1">Klik "Tambah Akun" untuk mulai</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ group, items }) => {
            const groupTotal = items.reduce((s, a) => s + Number(a.balance), 0)
            return (
              <div key={group} className="card p-0 overflow-hidden">
                {/* Group header */}
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">{group}</h3>
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{formatRupiah(groupTotal)}</span>
                </div>

                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {items.map(acc => (
                      <tr key={acc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        {/* Kode */}
                        <td className="px-5 py-3 w-28">
                          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{acc.code}</span>
                        </td>
                        {/* Nama + keterangan */}
                        <td className="px-3 py-3">
                          <p className="font-medium text-gray-800 dark:text-gray-100">{acc.name}</p>
                          {acc.description && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{acc.description}</p>
                          )}
                        </td>
                        {/* Tipe badge */}
                        <td className="px-3 py-3 hidden sm:table-cell">
                          <Badge color={TYPE_CONFIG[acc.type]?.color || 'gray'}>
                            {TYPE_CONFIG[acc.type]?.label || acc.type}
                          </Badge>
                        </td>
                        {/* Saldo */}
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <span className={`font-bold text-sm ${Number(acc.balance) < 0 ? 'text-red-600' : 'text-gray-800 dark:text-gray-100'}`}>
                            {formatRupiah(acc.balance)}
                          </span>
                        </td>
                        {/* Aksi */}
                        <td className="px-4 py-3 w-20">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600"
                              onClick={() => setEditTarget(acc)}
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500"
                              onClick={() => setDeleteTarget(acc)}
                              title="Hapus"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}

      {/* Persamaan akuntansi */}
      {accounts.length > 0 && (
        <div className="mt-5 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Persamaan Akuntansi</p>
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <span>Aset <strong className="text-blue-600">{formatRupiah(totalAset)}</strong></span>
            <span className="text-gray-400">=</span>
            <span>Kewajiban <strong className="text-red-500">{formatRupiah(totalKewajiban)}</strong></span>
            <span className="text-gray-400">+</span>
            <span>Modal <strong className="text-purple-600">{formatRupiah(totalModal + labaBersih)}</strong></span>
          </div>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Akun" size="md">
        <AccountForm onSubmit={handleCreate} onClose={() => setModalOpen(false)} />
      </Modal>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Akun" size="md">
        {editTarget && (
          <AccountForm initial={editTarget} onSubmit={handleUpdate} onClose={() => setEditTarget(null)} />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Akun"
        message={`Yakin ingin menghapus akun "${deleteTarget?.name}"?`}
        confirmLabel="Hapus Akun"
      />
    </div>
  )
}
