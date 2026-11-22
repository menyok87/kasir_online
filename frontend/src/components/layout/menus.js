import {
  LayoutDashboard, Tags, Package,
  ShoppingCart, Receipt, Users, Settings, BookOpen, BarChart3
} from 'lucide-react'

// Sumber tunggal daftar menu — dipakai Sidebar (desktop) & BottomNav (mobile).
export const allMenus = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard',       short: 'Beranda',   feature: 'dashboard' },
  { to: '/pos',          icon: ShoppingCart,    label: 'Kasir (POS)',     short: 'Kasir',     feature: 'pos' },
  { to: '/products',     icon: Package,         label: 'Produk',          short: 'Produk',    feature: 'products' },
  { to: '/categories',   icon: Tags,            label: 'Kategori',        short: 'Kategori',  feature: 'categories' },
  { to: '/transactions', icon: Receipt,         label: 'Transaksi',       short: 'Transaksi', feature: 'transactions' },
  { to: '/accounts',     icon: BookOpen,        label: 'Daftar Akun',     short: 'Akun',      feature: 'accounts' },
  { to: '/reports',      icon: BarChart3,       label: 'Laporan',         short: 'Laporan',   feature: 'reports' },
  { to: '/users',        icon: Users,           label: 'Manajemen User',  short: 'User',      feature: 'users' },
  { to: '/settings',     icon: Settings,        label: 'Pengaturan',      short: 'Atur',      feature: 'settings' },
]
