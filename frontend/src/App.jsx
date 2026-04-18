import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'

const Dashboard    = lazy(() => import('./pages/Dashboard'))
const Categories   = lazy(() => import('./pages/Categories'))
const Products     = lazy(() => import('./pages/Products'))
const POS          = lazy(() => import('./pages/POS'))
const Transactions = lazy(() => import('./pages/Transactions'))
const Accounts     = lazy(() => import('./pages/Accounts'))
const Users        = lazy(() => import('./pages/Users'))
const Settings     = lazy(() => import('./pages/Settings'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// Redirect ke login jika belum login; redirect dari /login jika sudah login
function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function RequireAdmin({ children }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <PageLoader />
  if (!isAdmin) return <Navigate to={user ? '/pos' : '/login'} replace />
  return children
}

function RequireSuperAdmin({ children }) {
  const { user, loading, isSuperAdmin } = useAuth()
  if (loading) return <PageLoader />
  if (!isSuperAdmin) return <Navigate to={user ? '/dashboard' : '/login'} replace />
  return children
}

function RequireCan({ feature, children }) {
  const { user, loading, can } = useAuth()
  if (loading) return <PageLoader />
  if (!can?.[feature]) return <Navigate to={user?.can?.pos ? '/pos' : '/transactions'} replace />
  return children
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (user) {
    const home = (user.role === 'kasir' || user.role === 'supervisor') ? '/transactions' : '/dashboard'
    return <Navigate to={user.role === 'kasir' ? '/pos' : home} replace />
  }
  return children
}

function wrap(Component) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  )
}

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />

          {/* Protected */}
          <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* superadmin + admin + supervisor */}
            <Route path="dashboard"  element={<RequireCan feature="dashboard">{wrap(Dashboard)}</RequireCan>} />

            {/* superadmin + admin */}
            <Route path="categories" element={<RequireCan feature="categories">{wrap(Categories)}</RequireCan>} />
            <Route path="settings"   element={<RequireCan feature="settings">{wrap(Settings)}</RequireCan>} />

            {/* superadmin + admin + supervisor */}
            <Route path="products"   element={<RequireCan feature="products">{wrap(Products)}</RequireCan>} />

            {/* superadmin + admin */}
            <Route path="accounts" element={<RequireCan feature="accounts">{wrap(Accounts)}</RequireCan>} />
            <Route path="users"    element={<RequireCan feature="users">{wrap(Users)}</RequireCan>} />

            {/* All roles */}
            <Route path="pos"          element={wrap(POS)} />
            <Route path="transactions" element={wrap(Transactions)} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  )
}
