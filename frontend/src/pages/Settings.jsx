import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import {
  Store, Phone, MapPin, Mail, Globe, FileText, Save,
  QrCode, Landmark, ImagePlus, X, CheckCircle,
  Building2, CreditCard, Receipt, Settings2, ChevronRight,
  Lock, Eye, EyeOff, ShieldCheck, Smartphone, ExternalLink, AlertTriangle
} from 'lucide-react'
import { getSettings, updateSettings, uploadProductImage, changePassword } from '../api'
import { FullPageSpinner } from '../components/ui/Spinner'
import { getImageUrl } from '../utils/getImageUrl'

const defaultSettings = {
  store_name: '', store_tagline: '', store_address: '',
  store_phone: '', store_email: '', store_website: '',
  footer_msg: '', show_footer_note: true,
  store_logo: '', qris_image: '', bank_name: '', bank_account_number: '',
  bank_account_name: '', bank_branch: '',
  midtrans_server_key: '', midtrans_client_key: '', midtrans_is_production: false,
}

const SECTIONS = [
  { id: 'toko',      label: 'Info Toko', icon: Store,       color: 'blue'   },
  { id: 'kontak',    label: 'Kontak',    icon: MapPin,      color: 'teal'   },
  { id: 'qris',      label: 'QRIS',      icon: QrCode,      color: 'violet' },
  { id: 'bank',      label: 'Bank',      icon: Landmark,    color: 'amber'  },
  { id: 'gopay',     label: 'GoPay',     icon: Smartphone,  color: 'green'  },
  { id: 'struk',     label: 'Struk',     icon: FileText,    color: 'rose'   },
  { id: 'keamanan',  label: 'Keamanan',  icon: Lock,        color: 'slate'  },
]

const C = {
  blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',     icon: 'text-blue-600 dark:text-blue-400',   activePill: 'bg-blue-600 text-white',   activeSide: 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/50' },
  teal:   { bg: 'bg-teal-50 dark:bg-teal-900/20',     icon: 'text-teal-600 dark:text-teal-400',   activePill: 'bg-teal-600 text-white',   activeSide: 'bg-teal-600 text-white shadow-md shadow-teal-200 dark:shadow-teal-900/50'  },
  violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', icon: 'text-violet-600 dark:text-violet-400',activePill: 'bg-violet-600 text-white', activeSide: 'bg-violet-600 text-white shadow-md shadow-violet-200 dark:shadow-violet-900/50'},
  amber:  { bg: 'bg-amber-50 dark:bg-amber-900/20',   icon: 'text-amber-600 dark:text-amber-400', activePill: 'bg-amber-500 text-white',  activeSide: 'bg-amber-500 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/50' },
  rose:   { bg: 'bg-rose-50 dark:bg-rose-900/20',     icon: 'text-rose-600 dark:text-rose-400',   activePill: 'bg-rose-600 text-white',   activeSide: 'bg-rose-600 text-white shadow-md shadow-rose-200 dark:shadow-rose-900/50'   },
  green:  { bg: 'bg-green-50 dark:bg-green-900/20',   icon: 'text-green-600 dark:text-green-400', activePill: 'bg-green-600 text-white',  activeSide: 'bg-green-600 text-white shadow-md shadow-green-200 dark:shadow-green-900/50' },
  slate:  { bg: 'bg-slate-50 dark:bg-slate-800/60',   icon: 'text-slate-600 dark:text-slate-400', activePill: 'bg-slate-600 text-white',  activeSide: 'bg-slate-600 text-white shadow-md shadow-slate-200 dark:shadow-slate-900/50' },
}

// ── Shared ────────────────────────────────────────────────────────────────────
function Field({ label, hint, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500 font-normal">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function SectionCard({ title, subtitle, icon: Icon, color = 'blue', children }) {
  const c = C[color]
  return (
    <div className="card p-4 md:p-6">
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={17} className={c.icon} />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm md:text-base leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

// ── Desktop Sidebar ───────────────────────────────────────────────────────────
function DesktopSidebar({ active, onChange, saving }) {
  return (
    <aside className="hidden lg:flex flex-col gap-1 w-52 flex-shrink-0 sticky top-4">
      {SECTIONS.map(s => {
        const c = C[s.color]
        const on = active === s.id
        return (
          <button key={s.id} onClick={() => onChange(s.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left
              ${on ? c.activeSide : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <s.icon size={15} className={on ? 'text-white' : c.icon} />
            {s.label}
            {on && <ChevronRight size={13} className="ml-auto opacity-70" />}
          </button>
        )
      })}
      {!['keamanan'].includes(active) && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl shadow-sm transition-all">
            {saving
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Menyimpan...</>
              : <><Save size={14} />Simpan</>}
          </button>
        </div>
      )}
    </aside>
  )
}

// ── Mobile Tab Bar ────────────────────────────────────────────────────────────
function MobileTabs({ active, onChange }) {
  return (
    <div className="lg:hidden -mx-3 md:-mx-6 px-3 md:px-6 mb-4 overflow-x-auto scrollbar-hide border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
      <div className="flex gap-0 min-w-max">
        {SECTIONS.map(s => {
          const c = C[s.color]
          const on = active === s.id
          return (
            <button key={s.id} onClick={() => onChange(s.id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap
                ${on
                  ? `${c.icon} border-current`
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200'}`}>
              <s.icon size={15} />
              {s.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Floating Save (mobile) ────────────────────────────────────────────────────
function FloatingSave({ saving }) {
  return (
    <div className="lg:hidden fixed bottom-4 right-4 z-50">
      <button type="submit" disabled={saving}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-semibold text-sm px-5 py-3 rounded-2xl shadow-xl shadow-blue-500/40 transition-all">
        {saving
          ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Menyimpan...</>
          : <><Save size={15} />Simpan</>}
      </button>
    </div>
  )
}

// ── Panel: Info Toko ──────────────────────────────────────────────────────────
function PanelToko({ form, set, setForm }) {
  const [uploading, setUploading] = useState(false)
  const logoRef = useRef(null)

  async function handleLogoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const { data } = await uploadProductImage(file)
      setForm(f => ({ ...f, store_logo: data.url }))
      toast.success('Logo toko berhasil diupload')
    } catch (err) {
      toast.error(err.message)
    } finally { setUploading(false) }
  }

  return (
    <SectionCard title="Informasi Toko" subtitle="Nama, logo, dan identitas bisnis" icon={Store} color="blue">
      {/* Logo upload */}
      <Field label="Logo Toko" hint="(opsional — tampil di struk)">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            {form.store_logo ? (
              <>
                <img src={getImageUrl(form.store_logo)} alt="Logo"
                  className="w-20 h-20 object-contain rounded-2xl border-2 border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-800 p-1.5 shadow-md" />
                <button type="button" onClick={() => setForm(f => ({ ...f, store_logo: '' }))}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors">
                  <X size={10} />
                </button>
              </>
            ) : (
              <button type="button" onClick={() => logoRef.current?.click()} disabled={uploading}
                className="w-20 h-20 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95 transition-all flex flex-col items-center justify-center gap-1 text-blue-400 hover:text-blue-600 disabled:opacity-50">
                {uploading
                  ? <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  : <>
                      <ImagePlus size={18} />
                      <span className="text-[10px] font-medium">Upload</span>
                    </>
                }
              </button>
            )}
            <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>Logo tampil di header struk dan faktur PDF.</p>
            <p>Format JPG / PNG, transparan (PNG) lebih baik.</p>
            {form.store_logo && (
              <button type="button" onClick={() => logoRef.current?.click()}
                className="text-blue-600 hover:underline font-medium transition-colors">
                Ganti logo
              </button>
            )}
          </div>
        </div>
      </Field>

      <Field label="Nama Toko" required>
        <div className="relative">
          <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input className="input pl-9" value={form.store_name} onChange={set('store_name')}
            placeholder="Contoh: Warung Berkah Jaya" required />
        </div>
      </Field>
      <Field label="Tagline / Slogan" hint="(opsional)">
        <div className="relative">
          <Settings2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input className="input pl-9" value={form.store_tagline} onChange={set('store_tagline')}
            placeholder="Contoh: Belanja Mudah & Murah" />
        </div>
      </Field>
      {form.store_name && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
          {form.store_logo
            ? <img src={getImageUrl(form.store_logo)} alt="Logo"
                className="w-9 h-9 object-contain rounded-xl bg-white dark:bg-gray-800 p-0.5 flex-shrink-0 border border-blue-100 dark:border-blue-800" />
            : <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow shadow-blue-400/30">
                {form.store_name.charAt(0).toUpperCase()}
              </div>
          }
          <div className="min-w-0">
            <p className="font-bold text-blue-900 dark:text-blue-100 text-sm truncate">{form.store_name}</p>
            {form.store_tagline && <p className="text-xs text-blue-600 dark:text-blue-400 truncate">{form.store_tagline}</p>}
          </div>
          <CheckCircle size={15} className="ml-auto text-blue-500 flex-shrink-0" />
        </div>
      )}
    </SectionCard>
  )
}

// ── Panel: Kontak ─────────────────────────────────────────────────────────────
function PanelKontak({ form, set }) {
  return (
    <SectionCard title="Kontak & Alamat" subtitle="Tampil di struk pembayaran" icon={MapPin} color="teal">
      <Field label="Alamat Toko">
        <textarea className="input resize-none" rows={2} value={form.store_address}
          onChange={set('store_address')} placeholder="Jl. Raya No. 1, Kecamatan, Kota" />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="No. Telepon">
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input className="input pl-9" value={form.store_phone} onChange={set('store_phone')}
              placeholder="0812-3456-7890" inputMode="tel" />
          </div>
        </Field>
        <Field label="Email">
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input className="input pl-9" type="email" value={form.store_email} onChange={set('store_email')}
              placeholder="toko@email.com" inputMode="email" />
          </div>
        </Field>
      </div>
      <Field label="Website" hint="(opsional)">
        <div className="relative">
          <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input className="input pl-9" value={form.store_website} onChange={set('store_website')}
            placeholder="www.tokosaya.com" inputMode="url" />
        </div>
      </Field>
    </SectionCard>
  )
}

// ── Panel: QRIS ───────────────────────────────────────────────────────────────
function PanelQris({ form, setForm }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const { data } = await uploadProductImage(file)
      setForm(f => ({ ...f, qris_image: data.url }))
      toast.success('Gambar QRIS berhasil diupload')
    } catch (err) {
      toast.error(err.message)
    } finally { setUploading(false) }
  }

  return (
    <SectionCard title="Pembayaran QRIS" subtitle="QR code untuk pembayaran pelanggan" icon={QrCode} color="violet">
      {/* Upload area — centered on mobile, left on sm+ */}
      <div className="flex flex-col items-center sm:flex-row sm:items-start gap-5">
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          {form.qris_image ? (
            <div className="relative">
              <img src={getImageUrl(form.qris_image)} alt="QRIS"
                className="w-36 h-36 object-contain rounded-2xl border-2 border-violet-200 dark:border-violet-700 bg-white dark:bg-gray-800 p-2 shadow-md" />
              <button type="button" onClick={() => setForm(f => ({ ...f, qris_image: '' }))}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors">
                <X size={11} />
              </button>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow whitespace-nowrap">
                ✓ QRIS Aktif
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
              className="w-36 h-36 rounded-2xl border-2 border-dashed border-violet-300 dark:border-violet-700 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 text-violet-400 hover:text-violet-600 disabled:opacity-50">
              {uploading
                ? <div className="w-7 h-7 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                : <>
                    <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
                      <ImagePlus size={22} />
                    </div>
                    <span className="text-xs font-medium">Upload QR Code</span>
                    <span className="text-[10px] text-violet-300 dark:text-violet-600">JPG / PNG</span>
                  </>
              }
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} />
          {form.qris_image && (
            <button type="button" onClick={() => inputRef.current?.click()}
              className="text-xs text-violet-600 hover:underline font-medium transition-colors">
              Ganti gambar
            </button>
          )}
        </div>

        {/* Steps */}
        <div className="flex-1 space-y-3 w-full">
          {[
            { n: 1, text: 'Dapatkan file QR code QRIS dari bank atau dompet digital Anda (GoPay, OVO, Dana, dll.)' },
            { n: 2, text: 'Upload gambar di sini (JPG atau PNG, maks 3 MB)' },
            { n: 3, text: 'Saat kasir memilih "QRIS", QR code muncul di layar untuk dipindai pelanggan' },
          ].map(s => (
            <div key={s.n} className="flex items-start gap-3">
              <div className="w-5 h-5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {s.n}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  )
}

// ── Panel: Bank ───────────────────────────────────────────────────────────────
function PanelBank({ form, set }) {
  const hasData = form.bank_name || form.bank_account_number
  return (
    <SectionCard title="Rekening Bank Transfer" subtitle="Tampil saat pelanggan memilih Transfer Bank" icon={Landmark} color="amber">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Nama Bank">
          <input className="input" value={form.bank_name} onChange={set('bank_name')}
            placeholder="BCA, BRI, Mandiri, BNI..." />
        </Field>
        <Field label="Nomor Rekening">
          <input className="input font-mono tracking-wider" value={form.bank_account_number}
            onChange={set('bank_account_number')} placeholder="1234567890" inputMode="numeric" />
        </Field>
        <Field label="Nama Pemilik">
          <input className="input" value={form.bank_account_name} onChange={set('bank_account_name')}
            placeholder="Nama sesuai rekening" />
        </Field>
        <Field label="Cabang" hint="(opsional)">
          <input className="input" value={form.bank_branch} onChange={set('bank_branch')}
            placeholder="KCP Sudirman" />
        </Field>
      </div>

      {hasData && (
        <div className="rounded-2xl overflow-hidden border border-amber-200 dark:border-amber-800/50 shadow-sm">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 flex items-center justify-between">
            <span className="text-white font-bold text-sm tracking-wide">{form.bank_name || 'NAMA BANK'}</span>
            <CreditCard size={17} className="text-white/80" />
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/10 px-4 py-3">
            <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wide mb-1">Nomor Rekening</p>
            <p className="font-mono text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-widest break-all">
              {form.bank_account_number || '—'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              a.n. <span className="font-semibold text-gray-800 dark:text-gray-200">{form.bank_account_name || '—'}</span>
            </p>
            {form.bank_branch && <p className="text-xs text-gray-400 mt-0.5">{form.bank_branch}</p>}
          </div>
        </div>
      )}
    </SectionCard>
  )
}

// ── Panel: Struk ──────────────────────────────────────────────────────────────
function PanelStruk({ form, set, setCheck, setForm }) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-4">
      {/* Form */}
      <SectionCard title="Pengaturan Struk" subtitle="Pesan footer dan catatan" icon={FileText} color="rose">
        <Field label="Pesan Footer" hint="(Enter untuk baris baru)">
          <textarea className="input resize-none" rows={3} value={form.footer_msg} onChange={set('footer_msg')}
            placeholder={'Terima kasih telah berbelanja!\nBarang yang sudah dibeli tidak dapat dikembalikan.'} />
        </Field>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative flex-shrink-0">
            <input type="checkbox" className="sr-only peer" checked={form.show_footer_note} onChange={setCheck('show_footer_note')} />
            <div className="w-10 h-6 bg-gray-200 dark:bg-gray-700 peer-checked:bg-rose-500 rounded-full transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Catatan bukti pembelian</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">"Simpan struk ini sebagai bukti pembelian"</p>
          </div>
        </label>
      </SectionCard>

      {/* Receipt preview */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Receipt size={14} className="text-gray-400" />
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Preview Struk</p>
        </div>
        <div className="max-w-xs mx-auto bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-800">
          {/* Header */}
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 text-white px-4 py-4 text-center">
            {form.store_logo && (
              <img src={getImageUrl(form.store_logo)} alt="Logo"
                className="w-12 h-12 object-contain mx-auto mb-2 rounded-lg bg-white/10 p-1" />
            )}
            <p className="font-bold text-sm tracking-widest uppercase">{form.store_name || 'NAMA TOKO'}</p>
            {form.store_tagline && <p className="text-gray-400 text-xs mt-0.5">{form.store_tagline}</p>}
            {form.store_address && <p className="text-gray-400 text-xs mt-1 leading-relaxed">{form.store_address}</p>}
            {form.store_phone   && <p className="text-gray-400 text-xs">Telp: {form.store_phone}</p>}
            {form.store_email   && <p className="text-gray-400 text-xs">{form.store_email}</p>}
          </div>
          {/* Body */}
          <div className="px-4 py-3 font-mono text-xs">
            <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-2 pb-2 border-b border-dashed border-gray-200 dark:border-gray-700">
              <span>{dateStr} {timeStr}</span>
              <span>Admin</span>
            </div>
            <div className="space-y-1.5 pb-2 mb-2 border-b border-dashed border-gray-200 dark:border-gray-700">
              {[['Kopi Susu', 2, 30000], ['Roti Bakar', 1, 12000]].map(([name, qty, price]) => (
                <div key={name}>
                  <p className="font-semibold text-gray-700 dark:text-gray-200">{name}</p>
                  <div className="flex justify-between text-gray-500 dark:text-gray-400 pl-2">
                    <span>{qty} × Rp {(price/qty).toLocaleString('id-ID')}</span>
                    <span>Rp {price.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-gray-800 dark:text-gray-100 text-sm py-1">
              <span>TOTAL</span><span>Rp 42.000</span>
            </div>
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Tunai</span><span>Rp 50.000</span>
            </div>
            <div className="flex justify-between text-gray-700 dark:text-gray-300 font-semibold">
              <span>Kembalian</span><span>Rp 8.000</span>
            </div>
            {(form.footer_msg || form.show_footer_note) && (
              <div className="mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400 space-y-0.5">
                {form.footer_msg?.split('\n').map((l, i) => <p key={i}>{l}</p>)}
                {form.show_footer_note && (
                  <p className="italic text-[10px] text-gray-400 dark:text-gray-500">
                    Simpan struk ini sebagai bukti pembelian
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="h-3 bg-white dark:bg-gray-900 border-t-2 border-dashed border-gray-100 dark:border-gray-800" />
        </div>
      </div>
    </div>
  )
}

// ── Panel: Keamanan (Ganti Password) ─────────────────────────────────────────
function PanelPassword() {
  const [form, setForm]     = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [show, setShow]     = useState({ current: false, new: false, confirm: false })
  const [saving, setSaving] = useState(false)
  const [done, setDone]     = useState(false)

  function toggle(field) { setShow(s => ({ ...s, [field]: !s[field] })) }
  function set(k) { return e => { setForm(f => ({ ...f, [k]: e.target.value })); setDone(false) } }

  function strength(pwd) {
    if (!pwd) return 0
    let s = 0
    if (pwd.length >= 6)  s++
    if (pwd.length >= 10) s++
    if (/[A-Z]/.test(pwd)) s++
    if (/[0-9]/.test(pwd)) s++
    if (/[^A-Za-z0-9]/.test(pwd)) s++
    return s
  }

  const str = strength(form.newPassword)
  const strLabel = ['', 'Sangat Lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat Kuat'][str]
  const strColor = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-500', 'bg-green-500'][str]

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.newPassword !== form.confirmPassword) {
      return toast.error('Konfirmasi password tidak cocok')
    }
    if (form.newPassword.length < 6) {
      return toast.error('Password baru minimal 6 karakter')
    }
    setSaving(true)
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      toast.success('Password berhasil diubah')
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setDone(true)
    } catch (err) {
      toast.error(err.message)
    } finally { setSaving(false) }
  }

  function PasswordInput({ field, value, placeholder, label }) {
    return (
      <Field label={label} required>
        <div className="relative">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="input pl-9 pr-10"
            type={show[field] ? 'text' : 'password'}
            value={value}
            onChange={set(field === 'current' ? 'currentPassword' : field === 'new' ? 'newPassword' : 'confirmPassword')}
            placeholder={placeholder}
            autoComplete={field === 'current' ? 'current-password' : 'new-password'}
            required
          />
          <button type="button" onClick={() => toggle(field)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            {show[field] ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </Field>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <SectionCard title="Ganti Password" subtitle="Perbarui kata sandi akun Anda" icon={Lock} color="green">
        {done && (
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <ShieldCheck size={18} className="text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800 dark:text-green-200 font-medium">Password berhasil diperbarui.</p>
          </div>
        )}

        <PasswordInput field="current" value={form.currentPassword} label="Password Saat Ini" placeholder="Masukkan password saat ini" />
        <PasswordInput field="new"     value={form.newPassword}     label="Password Baru"     placeholder="Minimal 6 karakter" />

        {/* Strength bar */}
        {form.newPassword && (
          <div className="space-y-1.5">
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= str ? strColor : 'bg-gray-200 dark:bg-gray-700'}`} />
              ))}
            </div>
            <p className={`text-xs font-medium ${['','text-red-500','text-orange-400','text-yellow-500','text-blue-500','text-green-500'][str]}`}>
              Kekuatan: {strLabel}
            </p>
          </div>
        )}

        <PasswordInput field="confirm" value={form.confirmPassword} label="Konfirmasi Password Baru" placeholder="Ulangi password baru" />

        {/* Match indicator */}
        {form.confirmPassword && (
          <p className={`text-xs font-medium flex items-center gap-1.5 ${form.newPassword === form.confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
            {form.newPassword === form.confirmPassword
              ? <><CheckCircle size={13} /> Password cocok</>
              : <><X size={13} /> Password tidak cocok</>}
          </p>
        )}

        <div className="pt-1">
          <button type="submit" disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-sm shadow-green-500/30 transition-all">
            {saving
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Menyimpan...</>
              : <><ShieldCheck size={15} />Ubah Password</>}
          </button>
        </div>
      </SectionCard>
    </form>
  )
}

// ── Panel: GoPay / Midtrans ───────────────────────────────────────────────────
function PanelGopay({ form, set, setForm }) {
  const [showSK, setShowSK] = useState(false)
  const [showCK, setShowCK] = useState(false)
  const hasKeys = form.midtrans_server_key && form.midtrans_client_key

  return (
    <div className="space-y-4">
      <SectionCard title="Konfigurasi GoPay" subtitle="Midtrans API keys untuk menerima pembayaran GoPay" icon={Smartphone} color="green">
        {/* Setup guide */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3.5 border border-blue-100 dark:border-blue-900/30">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1.5">Cara Setup GoPay via Midtrans:</p>
          <ol className="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-decimal list-inside leading-relaxed">
            <li>Daftar di <strong>dashboard.midtrans.com</strong></li>
            <li>Masuk ke <strong>Settings → Access Keys</strong></li>
            <li>Salin <em>Server Key</em> dan <em>Client Key</em></li>
            <li>Aktifkan metode pembayaran <strong>GoPay</strong></li>
          </ol>
          <a href="https://dashboard.midtrans.com" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-700 dark:text-blue-300 font-semibold mt-2 hover:underline">
            Buka Midtrans Dashboard <ExternalLink size={10} />
          </a>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3 border border-gray-100 dark:border-gray-700">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Mode</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {form.midtrans_is_production ? 'Production — transaksi nyata' : 'Sandbox — uji coba gratis'}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer"
              checked={!!form.midtrans_is_production}
              onChange={e => setForm(f => ({ ...f, midtrans_is_production: e.target.checked }))} />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700
              peer-checked:after:translate-x-full peer-checked:after:border-white
              after:content-[''] after:absolute after:top-[2px] after:left-[2px]
              after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5
              after:transition-all peer-checked:bg-green-500" />
          </label>
        </div>

        {form.midtrans_is_production && (
          <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200 dark:border-amber-800">
            <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <strong>Mode Production aktif.</strong> Transaksi akan memotong saldo GoPay pelanggan sungguhan.
              Pastikan keys sudah benar.
            </p>
          </div>
        )}

        {/* Server Key */}
        <Field label="Server Key" required hint="Dimulai dengan SB- (sandbox) atau tanpa prefix (production)">
          <div className="relative">
            <input type={showSK ? 'text' : 'password'}
              className="input pr-10 font-mono text-sm"
              value={form.midtrans_server_key || ''}
              onChange={set('midtrans_server_key')}
              placeholder={form.midtrans_is_production ? 'Mid-server-...' : 'SB-Mid-server-...'} />
            <button type="button" onClick={() => setShowSK(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showSK ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>

        {/* Client Key */}
        <Field label="Client Key" hint="Untuk verifikasi di sisi klien">
          <div className="relative">
            <input type={showCK ? 'text' : 'password'}
              className="input pr-10 font-mono text-sm"
              value={form.midtrans_client_key || ''}
              onChange={set('midtrans_client_key')}
              placeholder={form.midtrans_is_production ? 'Mid-client-...' : 'SB-Mid-client-...'} />
            <button type="button" onClick={() => setShowCK(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showCK ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>

        {/* Status */}
        <div className={`rounded-xl px-4 py-3 flex items-center gap-2.5 border ${
          hasKeys
            ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30'
            : 'bg-gray-50 dark:bg-gray-800/60 border-gray-100 dark:border-gray-700'
        }`}>
          {hasKeys ? (
            <>
              <CheckCircle size={15} className="text-green-600 flex-shrink-0" />
              <p className="text-xs font-semibold text-green-700 dark:text-green-300">
                GoPay siap digunakan dalam mode {form.midtrans_is_production ? 'Production' : 'Sandbox'}.
                Metode bayar "GoPay" akan tersedia di halaman POS.
              </p>
            </>
          ) : (
            <>
              <Smartphone size={15} className="text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Isi Server Key dan Client Key untuk mengaktifkan pembayaran GoPay.
              </p>
            </>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Webhook Midtrans" subtitle="Konfigurasi notifikasi pembayaran otomatis" icon={Settings2} color="green">
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1.5">URL Webhook:</p>
          <code className="text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 px-3 py-2 rounded-lg block font-mono border border-gray-200 dark:border-gray-700 break-all select-all">
            {(import.meta.env.VITE_API_BASE_URL || window.location.origin) + '/api/gopay/notification'}
          </code>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Daftarkan URL ini di <strong>Midtrans Dashboard → Settings → Configuration → Payment Notification URL</strong>.
          </p>
        </div>
      </SectionCard>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Settings() {
  const [form, setForm]       = useState(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [active, setActive]   = useState('toko')

  useEffect(() => {
    getSettings()
      .then(({ data }) => setForm({ ...defaultSettings, ...data }))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  const set      = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const setCheck = k => e => setForm(f => ({ ...f, [k]: e.target.checked }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await updateSettings(form)
      setForm({ ...defaultSettings, ...data })
      toast.success('Pengaturan berhasil disimpan')
    } catch (err) {
      toast.error(err.message)
    } finally { setSaving(false) }
  }

  if (loading) return <FullPageSpinner />

  return (
    <form onSubmit={handleSubmit}>
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Pengaturan Toko</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Informasi, pembayaran, dan tampilan struk</p>
        </div>
      </div>

      {/* Mobile tab bar */}
      <MobileTabs active={active} onChange={setActive} />

      {/* Body */}
      <div className="flex gap-6 items-start">
        <DesktopSidebar active={active} onChange={setActive} saving={saving} />

        <div className="flex-1 min-w-0 pb-20 lg:pb-0">
          {active === 'toko'     && <PanelToko     form={form} set={set} setForm={setForm} />}
          {active === 'kontak'   && <PanelKontak   form={form} set={set} />}
          {active === 'qris'     && <PanelQris     form={form} setForm={setForm} />}
          {active === 'bank'     && <PanelBank     form={form} set={set} />}
          {active === 'gopay'    && <PanelGopay    form={form} set={set} setForm={setForm} />}
          {active === 'struk'    && <PanelStruk    form={form} set={set} setCheck={setCheck} setForm={setForm} />}
          {active === 'keamanan' && <PanelPassword />}
        </div>
      </div>

      {/* Floating save button — mobile only, hidden on keamanan tab */}
      {!['keamanan'].includes(active) && <FloatingSave saving={saving} />}
    </form>
  )
}
