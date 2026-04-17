import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Plus, Pencil, ShieldCheck, ShieldOff, Eye, EyeOff, User } from 'lucide-react'
import { getUsers, createUser, updateUser, toggleUser } from '../api'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import { FullPageSpinner } from '../components/ui/Spinner'

const roleLabel = { superadmin: 'Super Admin', admin: 'Admin', supervisor: 'Supervisor', kasir: 'Kasir' }
const roleColor = { superadmin: 'purple', admin: 'blue', supervisor: 'yellow', kasir: 'green' }

function getRoleOptions(myRole) {
  if (myRole === 'superadmin') {
    return [
      { value: 'kasir',      label: 'Kasir — hanya POS & transaksi' },
      { value: 'supervisor', label: 'Supervisor — dashboard & laporan' },
      { value: 'admin',      label: 'Admin — produk, kategori, pengaturan' },
      { value: 'superadmin', label: 'Super Admin — akses penuh' },
    ]
  }
  return [{ value: 'kasir', label: 'Kasir — hanya POS & transaksi' }]
}

function UserForm({ initial, onSubmit, onClose, myRole }) {
  const [form, setForm]       = useState({
    username: initial?.username || '',
    name:     initial?.name     || '',
    role:     initial?.role     || 'kasir',
    password: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const isEdit   = !!initial
  const roleOpts = getRoleOptions(myRole)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { name: form.name, role: form.role }
      if (!isEdit) {
        payload.username = form.username
        payload.password = form.password
      } else if (form.password) {
        payload.password = form.password
      }
      await onSubmit(payload)
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isEdit ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username <span className="text-red-500">*</span>
          </label>
          <input
            className="input"
            value={form.username}
            onChange={set('username')}
            required
            placeholder="username (huruf kecil, tanpa spasi)"
            autoComplete="off"
          />
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input className="input bg-gray-50 text-gray-500" value={initial.username} disabled />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nama Lengkap <span className="text-red-500">*</span>
        </label>
        <input
          className="input"
          value={form.name}
          onChange={set('name')}
          required
          placeholder="Nama lengkap"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
        {roleOpts.length === 1 ? (
          <input className="input bg-gray-50 text-gray-500" value={roleOpts[0].label} disabled />
        ) : (
          <select className="input" value={form.role} onChange={set('role')}>
            {roleOpts.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password {isEdit
            ? <span className="text-gray-400 font-normal">(kosongkan jika tidak diubah)</span>
            : <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <input
            className="input pr-10"
            type={showPass ? 'text' : 'password'}
            value={form.password}
            onChange={set('password')}
            required={!isEdit}
            placeholder={isEdit ? 'Biarkan kosong jika tidak diganti' : 'Minimal 6 karakter'}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPass(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Tambah User')}
        </button>
      </div>
    </form>
  )
}

export default function Users() {
  const { user: me, isSuperAdmin } = useAuth()
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await getUsers()
      setUsers(data)
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function handleCreate(values) {
    try {
      await createUser(values)
      toast.success('User berhasil ditambahkan')
      setModalOpen(false)
      fetchUsers()
    } catch (err) { toast.error(err.message) }
  }

  async function handleUpdate(values) {
    try {
      await updateUser(editTarget.id, values)
      toast.success('User berhasil diperbarui')
      setEditTarget(null)
      fetchUsers()
    } catch (err) { toast.error(err.message) }
  }

  async function handleToggle(u) {
    if (u.id === me?.id) return toast.error('Tidak bisa menonaktifkan akun sendiri')
    try {
      await toggleUser(u.id)
      toast.success(u.is_active ? 'User dinonaktifkan' : 'User diaktifkan')
      fetchUsers()
    } catch (err) { toast.error(err.message) }
  }

  if (loading) return <FullPageSpinner />

  const pageTitle = isSuperAdmin ? 'Manajemen User' : 'Manajemen Kasir'
  const addLabel  = isSuperAdmin ? 'Tambah User' : 'Tambah Kasir'

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-800">{pageTitle}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {users.length} user terdaftar
            {!isSuperAdmin && <span className="text-blue-500"> (kasir Anda)</span>}
          </p>
        </div>
        <button
          className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
          onClick={() => setModalOpen(true)}
        >
          <Plus size={16} /> {addLabel}
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 md:px-6 py-3 text-gray-600 font-medium">Nama</th>
                <th className="text-left px-4 md:px-6 py-3 text-gray-600 font-medium hidden sm:table-cell">Username</th>
                <th className="text-center px-4 md:px-6 py-3 text-gray-600 font-medium">Role</th>
                {isSuperAdmin && (
                  <th className="text-left px-4 md:px-6 py-3 text-gray-600 font-medium hidden lg:table-cell">Dibuat oleh</th>
                )}
                <th className="text-center px-4 md:px-6 py-3 text-gray-600 font-medium">Status</th>
                <th className="px-4 md:px-6 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} className="text-center py-10 text-gray-400">
                    <User size={32} className="mx-auto mb-2 opacity-30" />
                    <p>Belum ada kasir yang ditambahkan</p>
                  </td>
                </tr>
              )}
              {users.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 md:px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          {u.name}
                          {u.id === me?.id && <span className="ml-1.5 text-xs text-blue-500 font-normal">(Anda)</span>}
                        </p>
                        <p className="text-xs text-gray-400 sm:hidden">{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-3 text-gray-500 font-mono text-xs hidden sm:table-cell">{u.username}</td>
                  <td className="px-4 md:px-6 py-3 text-center">
                    <Badge color={roleColor[u.role]}>{roleLabel[u.role]}</Badge>
                  </td>
                  {isSuperAdmin && (
                    <td className="px-4 md:px-6 py-3 text-xs text-gray-500 hidden lg:table-cell">
                      {u.created_by_name || <span className="italic text-gray-300">—</span>}
                    </td>
                  )}
                  <td className="px-4 md:px-6 py-3 text-center">
                    <Badge color={u.is_active ? 'green' : 'red'}>
                      {u.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </td>
                  <td className="px-4 md:px-6 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                        onClick={() => setEditTarget(u)}
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className={`p-1.5 rounded-lg transition-colors ${
                          u.is_active ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-500'
                        } ${u.id === me?.id ? 'opacity-30 cursor-not-allowed' : ''}`}
                        onClick={() => handleToggle(u)}
                        title={u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        disabled={u.id === me?.id}
                      >
                        {u.is_active ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={addLabel} size="md">
        <UserForm myRole={me?.role} onSubmit={handleCreate} onClose={() => setModalOpen(false)} />
      </Modal>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit User" size="md">
        {editTarget && (
          <UserForm
            initial={editTarget}
            myRole={me?.role}
            onSubmit={handleUpdate}
            onClose={() => setEditTarget(null)}
          />
        )}
      </Modal>
    </div>
  )
}
