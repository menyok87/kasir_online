import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'

const Dashboard    = lazy(() => import('./pages/Dashboard'))
const Categories   = lazy(() => import('./pages/Categories'))
const Products     = lazy(() => import('./pages/Products'))
const POS          = lazy(() => import('./pages/POS'))
const Transactions = lazy(() => import('./pages/Transactions'))

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
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/pos" replace />
  return children
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (user) return <Navigate to={user.role === 'admin' ? '/dashboard' : '/pos'} replace />
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
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />

          {/* Protected */}
          <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Admin only */}
            <Route path="dashboard"  element={<RequireAdmin>{wrap(Dashboard)}</RequireAdmin>} />
            <Route path="categories" element={<RequireAdmin>{wrap(Categories)}</RequireAdmin>} />
            <Route path="products"   element={<RequireAdmin>{wrap(Products)}</RequireAdmin>} />

            {/* All roles */}
            <Route path="pos"          element={wrap(POS)} />
            <Route path="transactions" element={wrap(Transactions)} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
