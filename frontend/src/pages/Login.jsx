import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, Eye, EyeOff, AlertCircle, Moon, Sun, UserPlus, LogIn } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import api from '../api'

export default function Login() {
  const [tab, setTab]           = useState('login')  // 'login' | 'register'
  const { login }               = useAuth()
  const { dark, toggle }        = useTheme()
  const navigate                = useNavigate()

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

      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm border border-white/20 dark:border-gray-800 animate-fade-in overflow-hidden">
        {/* Logo */}
        <div className="text-center pt-8 pb-4 px-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl mb-3 shadow-xl shadow-blue-500/30">
            <Store size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Kasir Online</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Point of Sale</p>
        </div>

        {/* Tab switcher */}
        <div className="flex mx-8 mb-5 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all
              ${tab === 'login'
                ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            <LogIn size={15} /> Masuk
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all
              ${tab === 'register'
                ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            <UserPlus size={15} /> Daftar
          </button>
        </div>

        <div className="px-8 pb-8">
          {tab === 'login'
            ? <LoginForm login={login} navigate={navigate} />
            : <RegisterForm login={login} navigate={navigate} onSwitchToLogin={() => setTab('login')} />
          }
        </div>
      </div>
    </div>
  )
}

// ── Form Masuk ────────────────────────────────────────────────────────────────
function LoginForm({ login, navigate }) {
  const [form, setForm]         = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const set = k => e => { setError(''); setForm(f => ({ ...f, [k]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      login(data.token, data.user)
      navigate(data.user.role === 'kasir' ? '/pos' : '/dashboard', { replace: true })
    } catch (err) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('password') || msg.toLowerCase().includes('salah') || msg.toLowerCase().includes('tidak ditemukan') || msg.toLowerCase().includes('credentials')) {
        setError('Username atau password salah. Periksa kembali dan coba lagi.')
      } else if (msg.toLowerCase().includes('nonaktif') || msg.toLowerCase().includes('inactive') || msg.toLowerCase().includes('disabled')) {
        setError('Akun Anda dinonaktifkan. Hubungi administrator.')
      } else {
        setError(msg)
      }
    } finally { setLoading(false) }
  }

  return (
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
          value={form.username} onChange={set('username')}
          required autoComplete="username" autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
        <div className="relative">
          <input
            className={`input pr-10 ${error ? 'border-red-300 dark:border-red-700 focus:ring-red-400' : ''}`}
            type={showPass ? 'text' : 'password'}
            placeholder="Masukkan password"
            value={form.password} onChange={set('password')}
            required autoComplete="current-password"
          />
          <button type="button" onClick={() => setShowPass(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <button type="submit" className="btn-primary w-full py-2.5 text-sm" disabled={loading}>
        {loading
          ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Memproses...</span>
          : 'Masuk'
        }
      </button>

      <div className="mt-4 p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-2xl text-xs text-gray-500 dark:text-gray-400 space-y-1.5 border border-gray-100 dark:border-gray-700">
        <p className="font-semibold text-gray-600 dark:text-gray-300 mb-2">Akun default:</p>
        <div className="flex justify-between"><span className="text-purple-600 dark:text-purple-400 font-medium">Super Admin</span><span className="font-mono">superadmin / super123</span></div>
        <div className="flex justify-between"><span className="text-blue-600 dark:text-blue-400 font-medium">Admin</span><span className="font-mono">admin / admin123</span></div>
        <div className="flex justify-between"><span className="text-teal-600 dark:text-teal-400 font-medium">Supervisor</span><span className="font-mono">supervisor / supervisor123</span></div>
        <div className="flex justify-between"><span className="text-green-600 dark:text-green-400 font-medium">Kasir</span><span className="font-mono">kasir / kasir123</span></div>
      </div>
    </form>
  )
}

// ── Form Daftar ───────────────────────────────────────────────────────────────
function RegisterForm({ login, navigate, onSwitchToLogin }) {
  const [form, setForm] = useState({ name: '', username: '', store_name: '', password: '', confirmPassword: '' })
  const [showPass, setShowPass]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  const set = k => e => { setError(''); setForm(f => ({ ...f, [k]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) { setError('Password dan konfirmasi tidak cocok'); return }
    if (form.password.length < 6) { setError('Password minimal 6 karakter'); return }

    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', {
        username:   form.username,
        password:   form.password,
        name:       form.name,
        store_name: form.store_name,
      })
      login(data.token, data.user)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Pendaftaran gagal')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {error && (
        <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-3.5 py-3 text-sm">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Nama Toko / Usaha <span className="text-red-500">*</span>
        </label>
        <input className="input" placeholder="Contoh: Toko Berkah Jaya"
          value={form.store_name} onChange={set('store_name')} required autoFocus />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Nama Lengkap <span className="text-red-500">*</span>
        </label>
        <input className="input" placeholder="Nama pemilik / pengelola"
          value={form.name} onChange={set('name')} required />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Username <span className="text-red-500">*</span>
        </label>
        <input className="input" placeholder="Huruf kecil, tanpa spasi"
          value={form.username} onChange={set('username')} required autoComplete="off" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Password <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input className="input pr-10" type={showPass ? 'text' : 'password'}
            placeholder="Minimal 6 karakter"
            value={form.password} onChange={set('password')} required autoComplete="new-password" />
          <button type="button" onClick={() => setShowPass(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Konfirmasi Password <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input className="input pr-10" type={showConfirm ? 'text' : 'password'}
            placeholder="Ulangi password"
            value={form.confirmPassword} onChange={set('confirmPassword')} required autoComplete="new-password" />
          <button type="button" onClick={() => setShowConfirm(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <button type="submit" className="btn-primary w-full py-2.5 text-sm mt-1" disabled={loading}>
        {loading
          ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Mendaftar...</span>
          : 'Buat Akun'
        }
      </button>

      <p className="text-center text-xs text-gray-400 dark:text-gray-500 pt-1">
        Sudah punya akun?{' '}
        <button type="button" onClick={onSwitchToLogin} className="text-blue-600 hover:underline font-medium">
          Masuk di sini
        </button>
      </p>
    </form>
  )
}
