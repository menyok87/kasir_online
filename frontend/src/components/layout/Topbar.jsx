import { useLocation } from 'react-router-dom'
import { Store } from 'lucide-react'

const titles = {
  '/dashboard':    'Dashboard',
  '/pos':          'Kasir (POS)',
  '/products':     'Manajemen Produk',
  '/categories':   'Manajemen Kategori',
  '/transactions': 'Riwayat Transaksi',
}

export default function Topbar() {
  const { pathname } = useLocation()
  const title = titles[pathname] || 'Kasir Online'
  const now = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{now}</p>
      </div>
    </header>
  )
}
