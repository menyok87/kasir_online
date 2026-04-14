import { useLocation } from 'react-router-dom'
import { Menu, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const titles = {
  '/dashboard':    'Dashboard',
  '/pos':          'Kasir (POS)',
  '/products':     'Manajemen Produk',
  '/categories':   'Manajemen Kategori',
  '/transactions': 'Riwayat Transaksi',
  '/users':        'Manajemen User',
}

export default function Topbar({ onMenuClick }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const title = titles[pathname] || 'Kasir Online'
  const now = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <header className="bg-white border-b border-gray-200 px-3 md:px-6 py-3 md:py-4 flex items-center gap-3">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors flex-shrink-0"
      >
        <Menu size={20} />
      </button>

      <div className="min-w-0 flex-1">
        <h2 className="text-base md:text-lg font-semibold text-gray-800 leading-tight">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{now}</p>
      </div>

      {/* User info (desktop) + logout */}
      <div className="hidden md:flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-700">{user?.name}</p>
          <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
        </div>
        <button
          onClick={logout}
          title="Keluar"
          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
