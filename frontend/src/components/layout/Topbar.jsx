import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'

const titles = {
  '/dashboard':    'Dashboard',
  '/pos':          'Kasir (POS)',
  '/products':     'Manajemen Produk',
  '/categories':   'Manajemen Kategori',
  '/transactions': 'Riwayat Transaksi',
}

export default function Topbar({ onMenuClick }) {
  const { pathname } = useLocation()
  const title = titles[pathname] || 'Kasir Online'
  const now = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <header className="bg-white border-b border-gray-200 px-3 md:px-6 py-3 md:py-4 flex items-center gap-3">
      {/* Hamburger — hanya di mobile */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors flex-shrink-0"
      >
        <Menu size={20} />
      </button>

      <div className="min-w-0">
        <h2 className="text-base md:text-lg font-semibold text-gray-800 leading-tight">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{now}</p>
      </div>
    </header>
  )
}
