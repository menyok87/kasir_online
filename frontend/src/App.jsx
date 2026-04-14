import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"    element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
          <Route path="categories"   element={<Suspense fallback={<PageLoader />}><Categories /></Suspense>} />
          <Route path="products"     element={<Suspense fallback={<PageLoader />}><Products /></Suspense>} />
          <Route path="pos"          element={<Suspense fallback={<PageLoader />}><POS /></Suspense>} />
          <Route path="transactions" element={<Suspense fallback={<PageLoader />}><Transactions /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
