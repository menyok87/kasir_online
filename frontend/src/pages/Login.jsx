import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Store, Eye, EyeOff, AlertCircle, Moon, Sun,
  UserPlus, LogIn, KeyRound, ArrowLeft, CheckCircle2, Copy, Mail,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import api from '../api'

export default function Login() {
  const [tab, setTab]     = useState('login')  // 'login' | 'register' | 'forgot'
  const { login }         = useAuth()
  const { dark, toggle }  = useTheme()
  const navigate          = useNavigate()

  const switchTab = t => setTab(t)

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

        {/* Tab switcher — sembunyikan jika di halaman forgot */}
        {tab !== 'forgot' && (
          <div className="flex mx-8 mb-5 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all
                ${tab === 'login'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              <LogIn size={15} /> Masuk
            </button>
            <button
              onClick={() => switchTab('register')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all
                ${tab === 'register'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              <UserPlus size={15} /> Daftar
            </button>
          </div>
        )}

        <div className="px-8 pb-8">
          {tab === 'login'   && <LoginForm    login={login} navigate={navigate} onForgot={() => switchTab('forgot')} />}
          {tab === 'register'&& <RegisterForm login={login} navigate={navigate} onSwitchToLogin={() => switchTab('login')} />}
          {tab === 'forgot'  && <ForgotPasswordForm onBack={() => switchTab('login')} />}
        </div>

        {/* Privacy Policy */}
        <div className="px-8 pb-6 text-center">
          <Link
            to="/privacy-policy"
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Kebijakan Privasi
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Form Masuk ────────────────────────────────────────────────────────────────
function LoginForm({ login, navigate, onForgot }) {
  const [form, setForm]             = useState({ username: '', password: '' })
  const [showPass, setShowPass]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  // state untuk email belum terverifikasi
  const [unverified, setUnverified] = useState(null)  // { email: 'j***@...' }
  const [resendLoading, setResendLoading] = useState(false)
  const [resendDone, setResendDone]       = useState(false)

  const set = k => e => { setError(''); setUnverified(null); setForm(f => ({ ...f, [k]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setUnverified(null)
    setResendDone(false)
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      login(data.token, data.user)
      navigate(data.user.role === 'kasir' ? '/pos' : '/dashboard', { replace: true })
    } catch (err) {
      const res = err.response?.data || {}
      if (res.unverified) {
        setUnverified({ email: res.email })
      } else {
        const msg = err.message || ''
        if (msg.toLowerCase().includes('salah') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials')) {
          setError('Username atau password salah. Periksa kembali dan coba lagi.')
        } else if (msg.toLowerCase().includes('nonaktif') || msg.toLowerCase().includes('disabled')) {
          setError('Akun Anda dinonaktifkan. Hubungi administrator.')
        } else {
          setError(msg)
        }
      }
    } finally { setLoading(false) }
  }

  async function handleResend() {
    if (!unverified?.email) return
    setResendLoading(true)
    try {
      // kirim ulang dengan email yang tersimpan (kita minta user masukkan email secara terpisah)
      // Karena kita hanya punya masked email, tampilkan form mini resend
      setUnverified(u => ({ ...u, showResend: true }))
    } finally { setResendLoading(false) }
  }

  async function handleResendSubmit(emailInput) {
    setResendLoading(true)
    try {
      await api.post('/auth/resend-verification', { email: emailInput })
      setResendDone(true)
      setUnverified(null)
    } catch (err) {
      setError(err.message || 'Gagal mengirim ulang email')
    } finally { setResendLoading(false) }
  }

  // Tampilkan form resend jika diminta
  if (unverified?.showResend) {
    return <ResendForm
      maskedEmail={unverified.email}
      loading={resendLoading}
      onSubmit={handleResendSubmit}
      onCancel={() => setUnverified(null)}
    />
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email belum diverifikasi */}
      {unverified && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3.5 py-3">
          <div className="flex items-start gap-2.5">
            <Mail size={16} className="flex-shrink-0 mt-0.5 text-amber-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Email belum diverifikasi</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Cek inbox <strong>{unverified.email}</strong> dan klik link verifikasi.
              </p>
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={handleResend}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 underline underline-offset-2">
                  Kirim ulang email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Berhasil kirim ulang */}
      {resendDone && (
        <div className="flex items-start gap-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3.5 py-3 text-sm">
          <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5 text-emerald-500" />
          <span className="text-emerald-700 dark:text-emerald-400">Link verifikasi baru telah dikirim. Cek inbox Anda.</span>
        </div>
      )}

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
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
          <button type="button" onClick={onForgot}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium transition-colors">
            Lupa password?
          </button>
        </div>
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
    </form>
  )
}

// ── Mini-form kirim ulang verifikasi ──────────────────────────────────────────
function ResendForm({ maskedEmail, loading, onSubmit, onCancel }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  async function handle(e) {
    e.preventDefault()
    setError('')
    try { await onSubmit(email) }
    catch { setError('Gagal mengirim. Coba lagi.') }
  }

  return (
    <form onSubmit={handle} className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <button type="button" onClick={onCancel}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors -ml-1">
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Kirim Ulang Verifikasi</p>
          <p className="text-xs text-gray-400">Masukkan email Anda: <em>{maskedEmail}</em></p>
        </div>
      </div>
      {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">{error}</p>}
      <input className="input" type="email" placeholder="email@contoh.com"
        value={email} onChange={e => setEmail(e.target.value)} required autoFocus inputMode="email" />
      <button type="submit" className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2" disabled={loading}>
        {loading
          ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Mengirim...</>
          : <><Mail size={14} />Kirim Link Verifikasi</>
        }
      </button>
    </form>
  )
}

// ── Form Lupa Password ────────────────────────────────────────────────────────
function ForgotPasswordForm({ onBack }) {
  // step: 'request' | 'reset' | 'done'
  const [step, setStep]           = useState('request')
  const [email, setEmail]         = useState('')
  const [maskedEmail, setMasked]  = useState('')
  const [devCode, setDevCode]     = useState('')   // kode tampil di layar (fallback: SMTP off)
  const [inputCode, setInputCode] = useState('')
  const [newPass, setNewPass]     = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [copied, setCopied]       = useState(false)

  // Step 1: kirim kode ke email
  async function handleRequest(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      if (data.emailSent) {
        // SMTP aktif → kode dikirim via email
        setMasked(data.maskedEmail || '')
        setDevCode('')
      } else if (data.code) {
        // Fallback: SMTP belum dikonfigurasi → tampilkan di layar
        setDevCode(data.code)
        setMasked('')
      }
      // Jika email tidak ditemukan server tetap jawab 200 dengan message saja
      setStep('reset')
    } catch (err) {
      setError(err.message || 'Gagal meminta kode reset')
    } finally { setLoading(false) }
  }

  // Step 2: verifikasi kode & set password baru
  async function handleReset(e) {
    e.preventDefault()
    setError('')
    if (newPass.length < 6) { setError('Password minimal 6 karakter'); return }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { email, code: inputCode, newPassword: newPass })
      setStep('done')
    } catch (err) {
      setError(err.message || 'Reset password gagal')
    } finally { setLoading(false) }
  }

  function copyCode() {
    navigator.clipboard?.writeText(devCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Step 1: masukkan email ────────────────────────────────────────────────
  if (step === 'request') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <button type="button" onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors -ml-1">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Lupa Password</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">Kode reset akan dikirim ke email Anda</p>
          </div>
        </div>

        <form onSubmit={handleRequest} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-3.5 py-3 text-sm">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                className="input pl-9"
                type="email"
                placeholder="email@contoh.com"
                value={email}
                onChange={e => { setError(''); setEmail(e.target.value) }}
                required autoFocus autoComplete="email" inputMode="email"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2" disabled={loading}>
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Mengirim...</>
              : <><Mail size={15} />Kirim Kode Reset</>
            }
          </button>
        </form>
      </div>
    )
  }

  // ── Step 2: masukkan kode + password baru ────────────────────────────────
  if (step === 'reset') {
    return (
      <form onSubmit={handleReset} className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <button type="button" onClick={() => { setStep('request'); setError(''); setInputCode('') }}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors -ml-1">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Masukkan Kode</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">Berlaku 30 menit</p>
          </div>
        </div>

        {/* Notif email terkirim */}
        {maskedEmail && !devCode && (
          <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-3.5 py-3">
            <Mail size={16} className="flex-shrink-0 mt-0.5 text-blue-500" />
            <div>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Cek Email Anda</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                Kode 6 digit dikirim ke <strong>{maskedEmail}</strong>. Cek inbox atau folder Spam.
              </p>
            </div>
          </div>
        )}

        {/* Fallback: SMTP off — tampilkan kode di layar */}
        {devCode && (
          <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-4 text-center">
            <p className="text-xs text-violet-600 dark:text-violet-400 font-medium mb-2">Kode Reset (mode offline)</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl font-black tracking-[0.3em] text-violet-700 dark:text-violet-300 tabular-nums font-mono">
                {devCode}
              </span>
              <button type="button" onClick={copyCode}
                className="p-2 rounded-xl bg-violet-100 dark:bg-violet-800/40 hover:bg-violet-200 text-violet-600 dark:text-violet-400 transition-all active:scale-90"
                title="Salin kode">
                {copied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* Email tidak terdaftar — tetap tampilkan form tapi beri info */}
        {!maskedEmail && !devCode && (
          <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3.5 py-3">
            <Mail size={16} className="flex-shrink-0 mt-0.5 text-amber-500" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Jika email terdaftar, kode telah dikirim ke inbox Anda. Cek folder Spam jika tidak ada.
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-3.5 py-3 text-sm">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Kode Reset (6 digit)</label>
          <input
            className="input text-center tracking-widest text-xl font-mono font-bold"
            placeholder="• • • • • •"
            value={inputCode}
            onChange={e => { setError(''); setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6)) }}
            required inputMode="numeric" maxLength={6} autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password Baru</label>
          <div className="relative">
            <input
              className="input pr-10"
              type={showPass ? 'text' : 'password'}
              placeholder="Minimal 6 karakter"
              value={newPass}
              onChange={e => { setError(''); setNewPass(e.target.value) }}
              required autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowPass(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
          disabled={loading || inputCode.length !== 6}>
          {loading
            ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Memproses...</>
            : <><KeyRound size={15} />Reset Password</>
          }
        </button>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          Tidak terima email?{' '}
          <button type="button" onClick={() => { setStep('request'); setInputCode(''); setError('') }}
            className="text-blue-600 hover:underline font-medium flex-shrink-0 inline">
            Kirim ulang
          </button>
        </p>
      </form>
    )
  }

  // ── Step 3: berhasil ──────────────────────────────────────────────────────
  return (
    <div className="text-center space-y-4 py-2">
      <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
        <CheckCircle2 size={36} className="text-emerald-500" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Password Direset!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Password berhasil diubah. Silakan login dengan password baru Anda.
        </p>
      </div>
      <button type="button" onClick={onBack}
        className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
        <LogIn size={15} /> Masuk Sekarang
      </button>
    </div>
  )
}

// ── Form Daftar ───────────────────────────────────────────────────────────────
function RegisterForm({ login, navigate, onSwitchToLogin }) {
  const [form, setForm] = useState({ name: '', username: '', email: '', store_name: '', password: '', confirmPassword: '' })
  const [showPass, setShowPass]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [pendingEmail, setPendingEmail] = useState(null) // email masked setelah daftar

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
        email:      form.email,
      })

      if (data.needsVerification) {
        // SMTP aktif → minta verifikasi email
        setPendingEmail(data.email)
      } else {
        // SMTP tidak aktif → langsung login
        login(data.token, data.user)
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Pendaftaran gagal')
    } finally { setLoading(false) }
  }

  // Tampilan setelah daftar: cek email
  if (pendingEmail) {
    return (
      <div className="text-center space-y-4 py-2">
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
          <Mail size={32} className="text-blue-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Cek Email Anda!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Link aktivasi telah dikirim ke <strong className="text-gray-700 dark:text-gray-200">{pendingEmail}</strong>.
            Klik link tersebut untuk mengaktifkan akun.
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3.5 py-3 text-left">
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            ⏰ Link berlaku <strong>24 jam</strong>. Cek folder <em>Spam/Junk</em> jika tidak ada di inbox.
          </p>
        </div>
        <button type="button" onClick={onSwitchToLogin}
          className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
          <LogIn size={14} /> Sudah verifikasi? Masuk
        </button>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Tidak terima email?{' '}
          <button type="button" onClick={() => setPendingEmail(null)}
            className="text-blue-600 hover:underline font-medium">
            Daftar ulang
          </button>
        </p>
      </div>
    )
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
          Email <span className="text-red-500">*</span>
        </label>
        <input className="input" type="email" placeholder="email@contoh.com"
          value={form.email} onChange={set('email')} required autoComplete="email" inputMode="email" />
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
