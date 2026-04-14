import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Tags, Package,
  ShoppingCart, Receipt, Store
} from 'lucide-react'

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pos',          icon: ShoppingCart,    label: 'Kasir (POS)' },
  { to: '/products',     icon: Package,         label: 'Produk' },
  { to: '/categories',   icon: Tags,            label: 'Kategori' },
  { to: '/transactions', icon: Receipt,         label: 'Transaksi' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Store size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base leading-tight">Kasir Online</h1>
          <p className="text-xs text-gray-400">Point of Sale</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-gray-700 text-xs text-gray-500">
        v1.0.0 &copy; {new Date().getFullYear()}
      </div>
    </aside>
  )
}
