import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, Eye, EyeOff, AlertCircle, Moon, Sun } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import api from '../api'

export default function Login() {
  const [form, setForm]         = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const { login }               = useAuth()
  const { dark, toggle }        = useTheme()
  const navigate                = useNavigate()

  const set = k => e => {
    setError('')
    setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      login(data.token, data.user)
      navigate(data.user.role === 'admin' ? '/dashboard' : '/pos', { replace: true })
    } catch (err) {
      const msg = err.message || 'Terjadi kesalahan'
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('password') || msg.toLowerCase().includes('salah') || msg.toLowerCase().includes('tidak ditemukan') || msg.toLowerCase().includes('credentials')) {
        setError('Username atau password salah. Periksa kembali dan coba lagi.')
      } else if (msg.toLowerCase().includes('nonaktif') || msg.toLowerCase().includes('inactive') || msg.toLowerCase().includes('disabled')) {
        setError('Akun Anda dinonaktifkan. Hubungi administrator.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4 transition-colors duration-300">
      {/* Dark mode toggle */}
      <button
        onClick={toggle}
        className="fixed top-4 right-4 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm"
        title={dark ? 'Mode Terang' : 'Mode Gelap'}
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm p-8 border border-white/20 dark:border-gray-800 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl mb-4 shadow-xl shadow-blue-500/30">
            <Store size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Kasir Online</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Masuk ke akun Anda</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-3.5 py-3 text-sm">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Username</label>
            <input
              className={`input ${error ? 'border-red-300 dark:border-red-700 focus:ring-red-400' : ''}`}
              placeholder="Masukkan username"
              value={form.username}
              onChange={set('username')}
              required
              autoComplete="username"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                className={`input pr-10 ${error ? 'border-red-300 dark:border-red-700 focus:ring-red-400' : ''}`}
                type={showPass ? 'text' : 'password'}
                placeholder="Masukkan password"
                value={form.password}
                onChange={set('password')}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full mt-2 py-2.5 text-sm" disabled={loading}>
            {loading
              ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Memproses...</span>
              : 'Masuk'
            }
          </button>
        </form>

        <div className="mt-6 p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-2xl text-xs text-gray-500 dark:text-gray-400 space-y-1.5 border border-gray-100 dark:border-gray-700">
          <p className="font-semibold text-gray-600 dark:text-gray-300 mb-2">Akun default:</p>
          <div className="flex justify-between"><span className="text-purple-600 dark:text-purple-400 font-medium">Super Admin</span><span className="font-mono text-gray-600 dark:text-gray-400">superadmin / super123</span></div>
          <div className="flex justify-between"><span className="text-blue-600 dark:text-blue-400 font-medium">Admin</span><span className="font-mono text-gray-600 dark:text-gray-400">admin / admin123</span></div>
          <div className="flex justify-between"><span className="text-teal-600 dark:text-teal-400 font-medium">Supervisor</span><span className="font-mono text-gray-600 dark:text-gray-400">supervisor / supervisor123</span></div>
          <div className="flex justify-between"><span className="text-green-600 dark:text-green-400 font-medium">Kasir</span><span className="font-mono text-gray-600 dark:text-gray-400">kasir / kasir123</span></div>
        </div>
      </div>
    </div>
  )
}
