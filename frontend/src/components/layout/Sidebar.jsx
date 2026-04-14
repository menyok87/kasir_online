import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Tags, Package,
  ShoppingCart, Receipt, Store, X
} from 'lucide-react'

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pos',          icon: ShoppingCart,    label: 'Kasir (POS)' },
  { to: '/products',     icon: Package,         label: 'Produk' },
  { to: '/categories',   icon: Tags,            label: 'Kategori' },
  { to: '/transactions', icon: Receipt,         label: 'Transaksi' },
]

export default function Sidebar({ onClose }) {
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
        {/* Tombol X hanya di mobile */}
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

      <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-500">
        v1.0.0 &copy; {new Date().getFullYear()}
      </div>
    </aside>
  )
}
