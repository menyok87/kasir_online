import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Store, CheckCircle2, XCircle, Loader2, Mail, RefreshCw } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { Sun, Moon } from 'lucide-react'
import api from '../api'

export default function VerifyEmail() {
  const [searchParams]  = useSearchParams()
  const { dark, toggle } = useTheme()
  const token            = searchParams.get('token')

  // status: 'loading' | 'success' | 'already' | 'expired' | 'error'
  const [status, setStatus]   = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Token tidak ditemukan di URL.'); return }

    api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(({ data }) => {
        if (data.alreadyVerified) setStatus('already')
        else setStatus('success')
        setMessage(data.message || '')
      })
      .catch(err => {
        if (err.data?.expired) setStatus('expired')
        else setStatus('error')
        setMessage(err.data?.error || err.message || 'Terjadi kesalahan')
      })
  }, [token])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4 transition-colors duration-300">
      <button
        onClick={toggle}
        className="fixed top-4 right-4 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm"
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm border border-white/20 dark:border-gray-800 animate-fade-in overflow-hidden">
        {/* Logo */}
        <div className="text-center pt-8 pb-5 px-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl mb-3 shadow-xl shadow-blue-500/30">
            <Store size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Kasir Online</h1>
        </div>

        <div className="px-8 pb-8">
          {status === 'loading' && <LoadingState />}
          {status === 'success' && <SuccessState message={message} />}
          {status === 'already' && <AlreadyState />}
          {status === 'expired' && <ExpiredState />}
          {status === 'error'   && <ErrorState message={message} />}
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="text-center py-4 space-y-3">
      <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
        <Loader2 size={32} className="text-blue-500 animate-spin" />
      </div>
      <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Memverifikasi email...</p>
    </div>
  )
}

function SuccessState({ message }) {
  return (
    <div className="text-center space-y-4 py-2">
      <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
        <CheckCircle2 size={36} className="text-emerald-500" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Email Terverifikasi!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {message || 'Akun Anda sudah aktif. Silakan login untuk mulai menggunakan aplikasi.'}
        </p>
      </div>
      <Link to="/login"
        className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
        Masuk Sekarang
      </Link>
    </div>
  )
}

function AlreadyState() {
  return (
    <div className="text-center space-y-4 py-2">
      <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
        <CheckCircle2 size={36} className="text-blue-500" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Sudah Terverifikasi</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Email Anda sudah terverifikasi sebelumnya. Silakan login.
        </p>
      </div>
      <Link to="/login"
        className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
        Masuk Sekarang
      </Link>
    </div>
  )
}

function ExpiredState() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function handleResend(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/resend-verification', { email })
      setSent(true)
    } catch (err) {
      setError(err.message || 'Gagal mengirim ulang email')
    } finally { setLoading(false) }
  }

  if (sent) {
    return (
      <div className="text-center space-y-4 py-2">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
          <Mail size={32} className="text-emerald-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Email Terkirim!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Link verifikasi baru telah dikirim. Cek inbox Anda.
          </p>
        </div>
        <Link to="/login" className="block text-sm text-blue-600 hover:underline font-medium">
          Kembali ke halaman masuk
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4 py-2">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-3">
          <XCircle size={36} className="text-amber-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Link Kadaluarsa</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Link verifikasi sudah tidak berlaku. Minta link baru di bawah ini.
        </p>
      </div>

      <form onSubmit={handleResend} className="space-y-3">
        {error && (
          <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Alamat Email</label>
          <input
            className="input"
            type="email"
            placeholder="email@contoh.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
            inputMode="email"
          />
        </div>
        <button type="submit" className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2" disabled={loading}>
          {loading
            ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Mengirim...</>
            : <><RefreshCw size={14} />Kirim Ulang Link Verifikasi</>
          }
        </button>
      </form>
      <Link to="/login" className="block text-center text-xs text-gray-400 hover:text-blue-600 transition-colors">
        Kembali ke halaman masuk
      </Link>
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div className="text-center space-y-4 py-2">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
        <XCircle size={36} className="text-red-500" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Verifikasi Gagal</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>
      </div>
      <Link to="/login" className="block text-sm text-blue-600 hover:underline font-medium">
        Kembali ke halaman masuk
      </Link>
    </div>
  )
}
