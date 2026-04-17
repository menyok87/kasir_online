import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'

export default function Login() {
  const [form, setForm]       = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const { login }             = useAuth()
  const navigate              = useNavigate()

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
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3 shadow-lg">
            <Store size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Kasir Online</h1>
          <p className="text-sm text-gray-400 mt-1">Masuk ke akun Anda</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pesan error */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3.5 py-3 text-sm">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              className={`input transition-colors ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
              placeholder="Masukkan username"
              value={form.username}
              onChange={set('username')}
              required
              autoComplete="username"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                className={`input pr-10 transition-colors ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
            {loading
              ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Memproses...</span>
              : 'Masuk'
            }
          </button>
        </form>

        {/* Info akun default */}
        <div className="mt-6 p-3 bg-gray-50 rounded-xl text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-600 mb-1.5">Akun default:</p>
          <div className="flex justify-between"><span className="text-purple-600 font-medium">Super Admin</span><span className="font-mono">superadmin / super123</span></div>
          <div className="flex justify-between"><span className="text-blue-600 font-medium">Admin</span><span className="font-mono">admin / admin123</span></div>
          <div className="flex justify-between"><span className="text-teal-600 font-medium">Supervisor</span><span className="font-mono">supervisor / supervisor123</span></div>
          <div className="flex justify-between"><span className="text-green-600 font-medium">Kasir</span><span className="font-mono">kasir / kasir123</span></div>
        </div>
      </div>
    </div>
  )
}
