import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Tags, Package,
  ShoppingCart, Receipt, Store, X, LogOut, Users, Settings, BookOpen
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const allMenus = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard',       feature: 'dashboard' },
  { to: '/pos',          icon: ShoppingCart,    label: 'Kasir (POS)',     feature: 'pos' },
  { to: '/products',     icon: Package,         label: 'Produk',          feature: 'products' },
  { to: '/categories',   icon: Tags,            label: 'Kategori',        feature: 'categories' },
  { to: '/transactions', icon: Receipt,         label: 'Transaksi',       feature: 'transactions' },
  { to: '/accounts',     icon: BookOpen,        label: 'Daftar Akun',     feature: 'accounts' },
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

export default function Sidebar({ onClose }) {
  const { user, logout, can } = useAuth()
  const navItems = allMenus.filter(m => can?.[m.feature])

  return (
    <aside className="w-64 bg-gray-950 dark:bg-gray-900 text-white flex flex-col h-screen border-r border-gray-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-2 rounded-xl flex-shrink-0 shadow-lg shadow-blue-500/20">
          <Store size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-sm leading-tight text-white">Kasir Online</h1>
          <p className="text-xs text-gray-500">Point of Sale</p>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 flex-shrink-0 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              }`
            }
          >
            <Icon size={17} className="flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info + actions */}
      <div className="px-3 py-3 border-t border-gray-800">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl mb-1 bg-gray-900/50">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold shadow">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-200 truncate">{user?.name}</p>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white ${roleBadgeColor[user?.role] || 'bg-gray-600'}`}>
              {roleLabel[user?.role] || user?.role}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-red-900/30 hover:text-red-400 transition-all"
        >
          <LogOut size={14} />
          Keluar
        </button>
      </div>

    </aside>
  )
}
