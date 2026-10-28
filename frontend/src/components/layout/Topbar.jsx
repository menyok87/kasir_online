import { useLocation } from 'react-router-dom'
import { Menu, LogOut, Sun, Moon } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

const titles = {
  '/dashboard':    'Dashboard',
  '/pos':          'Kasir (POS)',
  '/products':     'Manajemen Produk',
  '/categories':   'Manajemen Kategori',
  '/transactions': 'Riwayat Transaksi',
  '/users':        'Manajemen User',
  '/settings':     'Pengaturan Toko',
}

export default function Topbar({ onMenuClick }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const title = titles[pathname] || 'Kasir Online'
  const now = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 md:px-6 py-3 md:py-4 flex items-center gap-3 shadow-sm">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors flex-shrink-0"
      >
        <Menu size={20} />
      </button>

      <div className="min-w-0 flex-1">
        <h2 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight">{title}</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 hidden sm:block">{now}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          title={dark ? 'Mode Terang' : 'Mode Gelap'}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User info + logout (desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{user?.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            title="Keluar"
            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
