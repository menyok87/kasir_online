import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Tags, Package,
  ShoppingCart, Receipt, Store, X, LogOut, User, Users, Settings, KeyRound, Eye, EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { changePassword } from '../../api'
import Modal from '../ui/Modal'

const allMenus = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard',       feature: 'dashboard' },
  { to: '/pos',          icon: ShoppingCart,    label: 'Kasir (POS)',     feature: 'pos' },
  { to: '/products',     icon: Package,         label: 'Produk',          feature: 'products' },
  { to: '/categories',   icon: Tags,            label: 'Kategori',        feature: 'categories' },
  { to: '/transactions', icon: Receipt,         label: 'Transaksi',       feature: 'transactions' },
  { to: '/users',        icon: Users,           label: 'Manajemen User',  feature: 'users' },
  { to: '/settings',     icon: Settings,        label: 'Pengaturan',      feature: 'settings' },
]

const roleLabel = {
  superadmin: 'Super Admin',
  admin:      'Admin',
  supervisor: 'Supervisor',
  kasir:      'Kasir',
}

const roleBadgeColor = {
  superadmin: 'bg-purple-600',
  admin:      'bg-blue-600',
  supervisor: 'bg-teal-600',
  kasir:      'bg-green-600',
}

function ChangePasswordModal({ isOpen, onClose }) {
  const [form, setForm]       = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [loading, setLoading]         = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.newPassword !== form.confirmPassword) {
      return toast.error('Password baru dan konfirmasi tidak cocok')
    }
    if (form.newPassword.length < 6) {
      return toast.error('Password baru minimal 6 karakter')
    }
    setLoading(true)
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      toast.success('Password berhasil diubah')
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Ganti Password" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password Lama</label>
          <div className="relative">
            <input
              className="input pr-10"
              type={showCurrent ? 'text' : 'password'}
              value={form.currentPassword}
              onChange={set('currentPassword')}
              required
              placeholder="Masukkan password lama"
              autoComplete="current-password"
            />
            <button type="button" onClick={() => setShowCurrent(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
          <div className="relative">
            <input
              className="input pr-10"
              type={showNew ? 'text' : 'password'}
              value={form.newPassword}
              onChange={set('newPassword')}
              required
              placeholder="Minimal 6 karakter"
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowNew(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
          <input
            className="input"
            type="password"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            required
            placeholder="Ulangi password baru"
            autoComplete="new-password"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={handleClose}>Batal</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function Sidebar({ onClose }) {
  const { user, logout, can } = useAuth()
  const [changePassOpen, setChangePassOpen] = useState(false)
  const navItems = allMenus.filter(m => can?.[m.feature])

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen">
      {/* Logo + tombol tutup (mobile) */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-700">
        <div className="bg-blue-600 p-2 rounded-lg flex-shrink-0">
          <Store size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-sm leading-tight">Kasir Online</h1>
          <p className="text-xs text-gray-400">Point of Sale</p>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1 rounded-lg hover:bg-gray-700 text-gray-400 flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-3 border-t border-gray-700">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg mb-1">
          <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User size={13} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name}</p>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white ${roleBadgeColor[user?.role] || 'bg-gray-600'}`}>
              {roleLabel[user?.role] || user?.role}
            </span>
          </div>
        </div>
        <button
          onClick={() => setChangePassOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <KeyRound size={15} />
          Ganti Password
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut size={15} />
          Keluar
        </button>
      </div>

      <ChangePasswordModal isOpen={changePassOpen} onClose={() => setChangePassOpen(false)} />
    </aside>
  )
}
