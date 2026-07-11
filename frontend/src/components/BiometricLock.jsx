import { useState, useEffect, useRef, useCallback } from 'react'
import { Fingerprint, Lock } from 'lucide-react'
import { isNativeApp, isBiometricEnabled, verifyBiometric } from '../utils/biometric'

// Layar kunci sidik jari untuk aplikasi Android. Muncul saat app dibuka /
// kembali dari background bila fitur diaktifkan. Di browser: tidak aktif.
export default function BiometricLock() {
  const active = isNativeApp() && isBiometricEnabled()
  const [locked, setLocked]   = useState(active)
  const [error, setError]     = useState('')
  const [busy, setBusy]       = useState(false)
  const promptingRef          = useRef(false)

  const prompt = useCallback(async () => {
    if (promptingRef.current) return
    promptingRef.current = true
    setBusy(true); setError('')
    try {
      await verifyBiometric('Buka Kasir Online')
      setLocked(false)
    } catch {
      setLocked(true)
      setError('Verifikasi gagal atau dibatalkan.')
    } finally {
      promptingRef.current = false
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (!active) return
    prompt() // minta sidik jari saat app dibuka
    const onVis = () => {
      if (document.visibilityState === 'visible') { setLocked(true); prompt() }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [active, prompt])

  if (!active || !locked) return null

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-6">
      <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center mb-6 backdrop-blur-sm">
        <Lock size={34} className="text-white" />
      </div>
      <h1 className="text-xl font-bold text-white">Kasir Online Terkunci</h1>
      <p className="text-sm text-white/70 mt-1.5 text-center max-w-xs">
        Verifikasi sidik jari untuk melanjutkan.
      </p>

      {error && (
        <p className="text-xs text-red-200 bg-red-500/20 border border-red-300/30 rounded-xl px-4 py-2 mt-4">{error}</p>
      )}

      <button onClick={prompt} disabled={busy}
        className="mt-8 flex items-center gap-2.5 bg-white text-blue-700 font-bold px-6 py-3.5 rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-60">
        {busy
          ? <><span className="w-5 h-5 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin" />Memverifikasi...</>
          : <><Fingerprint size={22} /> Buka dengan Sidik Jari</>}
      </button>
    </div>
  )
}
