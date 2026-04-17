import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session dari localStorage saat pertama load
  useEffect(() => {
    const token  = localStorage.getItem('token')
    const stored = localStorage.getItem('user')
    if (token && stored) {
      try {
        setUser(JSON.parse(stored))
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  function login(token, userData) {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(userData)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  const role         = user?.role
  const isSuperAdmin = role === 'superadmin'
  const isAdmin      = role === 'superadmin' || role === 'admin'
  const isManager    = role === 'superadmin' || role === 'admin' || role === 'supervisor'

  // Akses per fitur
  const can = {
    dashboard:  isManager,
    pos:        role === 'superadmin' || role === 'admin' || role === 'kasir',
    products:   isAdmin,
    categories: isAdmin,
    transactions: true,
    users:      isSuperAdmin,
    settings:   isAdmin,
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, isSuperAdmin, isManager, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
