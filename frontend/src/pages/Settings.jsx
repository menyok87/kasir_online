import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import {
  Store, Phone, MapPin, Mail, Globe, FileText, Save,
  QrCode, Landmark, ImagePlus, X, CheckCircle, ChevronRight,
  Building2, CreditCard, Receipt, Settings2
} from 'lucide-react'
import { getSettings, updateSettings, uploadProductImage } from '../api'
import { FullPageSpinner } from '../components/ui/Spinner'
import { getImageUrl } from '../utils/getImageUrl'

const defaultSettings = {
  store_name: '', store_tagline: '', store_address: '',
  store_phone: '', store_email: '', store_website: '',
  footer_msg: '', show_footer_note: true,
  qris_image: '', bank_name: '', bank_account_number: '',
  bank_account_name: '', bank_branch: '',
}

const SECTIONS = [
  { id: 'toko',   label: 'Info Toko',    icon: Store,    color: 'blue'   },
  { id: 'kontak', label: 'Kontak',       icon: MapPin,   color: 'teal'   },
  { id: 'qris',   label: 'QRIS',         icon: QrCode,   color: 'violet' },
  { id: 'bank',   label: 'Bank',         icon: Landmark, color: 'amber'  },
  { id: 'struk',  label: 'Struk',        icon: FileText, color: 'rose'   },
]

const COLOR = {
  blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',   icon: 'text-blue-600',   ring: 'ring-blue-500',   active: 'bg-blue-600 text-white shadow-blue-200 dark:shadow-blue-900' },
  teal:   { bg: 'bg-teal-50 dark:bg-teal-900/20',   icon: 'text-teal-600',   ring: 'ring-teal-500',   active: 'bg-teal-600 text-white shadow-teal-200 dark:shadow-teal-900'  },
  violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', icon: 'text-violet-600', ring: 'ring-violet-500', active: 'bg-violet-600 text-white shadow-violet-200 dark:shadow-violet-900' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-900/20',  icon: 'text-amber-600',  ring: 'ring-amber-500',  active: 'bg-amber-600 text-white shadow-amber-200 dark:shadow-amber-900'  },
  rose:   { bg: 'bg-rose-50 dark:bg-rose-900/20',    icon: 'text-rose-600',   ring: 'ring-rose-500',   active: 'bg-rose-600 text-white shadow-rose-200 dark:shadow-rose-900'    },
}

function SectionNav({ active, onChange, saving }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col gap-1 w-52 flex-shrink-0">
        {SECTIONS.map(s => {
          const c = COLOR[s.color]
          const isActive = active === s.id
          return (
            <button
              key={s.id}
              onClick={() => onChange(s.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left
                ${isActive
                  ? `${c.active} shadow-md`
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <s.icon size={16} className={isActive ? 'text-white' : c.icon} />
              {s.label}
              {isActive && <ChevronRight size={14} className="ml-auto opacity-70" />}
            </button>
          )
        })}

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl shadow-md shadow-blue-200 dark:shadow-blue-900/40 transition-all disabled:opacity-60"
            disabled={saving}
          >
            {saving
              ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Menyimpan...</>
              : <><Save size={15} />Simpan</>}
          </button>
        </div>
      </aside>

      {/* Mobile tabs */}
      <div className="lg:hidden flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        {SECTIONS.map(s => {
          const c = COLOR[s.color]
          const isActive = active === s.id
          return (
            <button
              key={s.id}
              onClick={() => onChange(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0
                ${isActive ? `${c.active} shadow-sm` : `${c.bg} ${c.icon}`}`}
            >
              <s.icon size={13} />
              {s.label}
            </button>
          )
        })}
      </div>
    </>
  )
}

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
  const c = COLOR[color]
  return (
    <div className="card p-6 md:p-8">
      <div className="flex items-start gap-4 mb-6 pb-5 border-b border-gray-100 dark:border-gray-800">
        <div className={`p-2.5 ${c.bg} rounded-xl flex-shrink-0`}>
          <Icon size={20} className={c.icon} />
        </div>
        <div>
          <h3 className="font-bold text-gray-800 dark:text-gray-100">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  )
}

// ── Panel: Info Toko ───────────────────────────────────────────────────────────
function PanelToko({ form, set }) {
  return (
    <SectionCard title="Informasi Toko" subtitle="Nama dan identitas bisnis Anda" icon={Store} color="blue">
      <Field label="Nama Toko" required>
        <div className="relative">
          <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" value={form.store_name} onChange={set('store_name')}
            placeholder="Contoh: Warung Berkah Jaya" required />
        </div>
      </Field>
      <Field label="Tagline / Slogan" hint="(opsional — tampil di bawah nama toko pada struk)">
        <div className="relative">
          <Settings2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" value={form.store_tagline} onChange={set('store_tagline')}
            placeholder="Contoh: Belanja Mudah & Murah" />
        </div>
      </Field>

      {/* Live badge preview */}
      {form.store_name && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md shadow-blue-300/40">
            {form.store_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-blue-900 dark:text-blue-100 text-sm">{form.store_name}</p>
            {form.store_tagline && <p className="text-xs text-blue-600 dark:text-blue-400">{form.store_tagline}</p>}
          </div>
          <CheckCircle size={16} className="ml-auto text-blue-500 flex-shrink-0" />
        </div>
      )}
    </SectionCard>
  )
}

// ── Panel: Kontak ──────────────────────────────────────────────────────────────
function PanelKontak({ form, set }) {
  return (
    <SectionCard title="Kontak & Alamat" subtitle="Informasi kontak yang tampil di struk" icon={MapPin} color="teal">
      <Field label="Alamat Toko">
        <textarea className="input resize-none" rows={2} value={form.store_address}
          onChange={set('store_address')} placeholder="Jl. Raya No. 1, Kecamatan, Kota" />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nomor Telepon">
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" value={form.store_phone} onChange={set('store_phone')}
              placeholder="0812-3456-7890" />
          </div>
        </Field>
        <Field label="Email">
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" type="email" value={form.store_email} onChange={set('store_email')}
              placeholder="toko@email.com" />
          </div>
        </Field>
      </div>
      <Field label="Website" hint="(opsional)">
        <div className="relative">
          <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" value={form.store_website} onChange={set('store_website')}
            placeholder="www.tokosaya.com" />
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
    <SectionCard title="Pembayaran QRIS" subtitle="QR code muncul saat pelanggan memilih metode QRIS" icon={QrCode} color="violet">
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Upload box */}
        <div className="flex-shrink-0">
          {form.qris_image ? (
            <div className="relative w-40 h-40">
              <img src={getImageUrl(form.qris_image)} alt="QRIS"
                className="w-40 h-40 object-contain rounded-2xl border-2 border-violet-200 dark:border-violet-800 bg-white p-2 shadow-md" />
              <button type="button" onClick={() => setForm(f => ({ ...f, qris_image: '' }))}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg transition-colors">
                <X size={12} />
              </button>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow whitespace-nowrap">
                ✓ QRIS Aktif
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
              className="w-40 h-40 rounded-2xl border-2 border-dashed border-violet-300 dark:border-violet-700 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all flex flex-col items-center justify-center gap-2 text-violet-400 hover:text-violet-600 disabled:opacity-50 group">
              {uploading
                ? <div className="w-7 h-7 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                : <>
                    <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center group-hover:bg-violet-200 dark:group-hover:bg-violet-800/40 transition-colors">
                      <ImagePlus size={22} />
                    </div>
                    <span className="text-xs font-medium text-center px-2">Upload QR Code</span>
                    <span className="text-[10px] text-violet-300 dark:text-violet-600">JPG / PNG</span>
                  </>
              }
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} />
          {form.qris_image && (
            <button type="button" onClick={() => inputRef.current?.click()}
              className="mt-3 text-xs text-violet-600 hover:text-violet-700 font-medium hover:underline block text-center w-40 transition-colors">
              Ganti gambar
            </button>
          )}
        </div>

        {/* Steps */}
        <div className="flex-1 space-y-3">
          {[
            { n: 1, text: 'Dapatkan file QR code QRIS dari bank atau aplikasi dompet digital Anda (GoPay, OVO, Dana, dll.)' },
            { n: 2, text: 'Upload gambar QR code di sini (format JPG atau PNG, maks 3 MB)' },
            { n: 3, text: 'Saat kasir memilih metode "QRIS", QR code otomatis muncul di layar untuk dipindai pelanggan' },
          ].map(step => (
            <div key={step.n} className="flex items-start gap-3">
              <div className="w-6 h-6 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {step.n}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  )
}

// ── Panel: Bank ────────────────────────────────────────────────────────────────
function PanelBank({ form, set }) {
  const hasData = form.bank_name || form.bank_account_number
  return (
    <SectionCard title="Rekening Bank Transfer" subtitle="Tampil saat pelanggan memilih Transfer Bank" icon={Landmark} color="amber">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nama Bank">
          <input className="input" value={form.bank_name} onChange={set('bank_name')}
            placeholder="BCA, BRI, Mandiri, BNI..." />
        </Field>
        <Field label="Nomor Rekening">
          <input className="input font-mono tracking-wider" value={form.bank_account_number}
            onChange={set('bank_account_number')} placeholder="1234567890" />
        </Field>
        <Field label="Nama Pemilik Rekening">
          <input className="input" value={form.bank_account_name} onChange={set('bank_account_name')}
            placeholder="Nama sesuai rekening" />
        </Field>
        <Field label="Cabang" hint="(opsional)">
          <input className="input" value={form.bank_branch} onChange={set('bank_branch')}
            placeholder="Contoh: KCP Sudirman" />
        </Field>
      </div>

      {/* Live bank card preview */}
      {hasData && (
        <div className="mt-2 rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 flex items-center justify-between">
            <span className="text-white font-bold text-sm tracking-wide">{form.bank_name || 'NAMA BANK'}</span>
            <CreditCard size={20} className="text-white/80" />
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/40 px-5 py-4">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold uppercase tracking-wide mb-1">Nomor Rekening</p>
            <p className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-widest mb-2">
              {form.bank_account_number || '—'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              a.n. <span className="font-semibold text-gray-800 dark:text-gray-200">{form.bank_account_name || '—'}</span>
            </p>
            {form.bank_branch && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{form.bank_branch}</p>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  )
}

// ── Panel: Struk ───────────────────────────────────────────────────────────────
function PanelStruk({ form, set, setCheck }) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Form */}
      <SectionCard title="Pengaturan Struk" subtitle="Konfigurasi pesan footer struk" icon={FileText} color="rose">
        <Field label="Pesan Footer" hint="(tampil di bawah struk, tekan Enter untuk baris baru)">
          <textarea className="input resize-none" rows={4} value={form.footer_msg} onChange={set('footer_msg')}
            placeholder={'Terima kasih telah berbelanja!\nBarang yang sudah dibeli tidak dapat dikembalikan.'} />
        </Field>
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative mt-0.5">
            <input type="checkbox" className="sr-only peer" checked={form.show_footer_note} onChange={setCheck('show_footer_note')} />
            <div className="w-10 h-6 bg-gray-200 dark:bg-gray-700 peer-checked:bg-rose-500 rounded-full transition-colors"></div>
            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"></div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
              Tampilkan catatan bukti pembelian
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              "Simpan struk ini sebagai bukti pembelian"
            </p>
          </div>
        </label>
      </SectionCard>

      {/* Receipt preview */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Receipt size={15} className="text-gray-400" />
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Preview Struk</p>
        </div>
        <div className="card p-0 overflow-hidden shadow-xl max-w-xs mx-auto w-full">
          {/* Struk header */}
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 text-white px-5 py-4 text-center">
            <p className="font-bold text-sm tracking-widest uppercase">{form.store_name || 'NAMA TOKO'}</p>
            {form.store_tagline && <p className="text-gray-400 text-xs mt-0.5">{form.store_tagline}</p>}
            {form.store_address && <p className="text-gray-400 text-xs mt-1 leading-relaxed">{form.store_address}</p>}
            {form.store_phone   && <p className="text-gray-400 text-xs">Telp: {form.store_phone}</p>}
            {form.store_email   && <p className="text-gray-400 text-xs">{form.store_email}</p>}
          </div>

          {/* Struk body */}
          <div className="bg-white dark:bg-gray-900 px-4 py-3 font-mono text-xs">
            <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-2 border-b border-dashed border-gray-200 dark:border-gray-700 pb-2">
              <span>{dateStr} {timeStr}</span>
              <span>Kasir: Admin</span>
            </div>

            {/* Sample items */}
            <div className="space-y-1 border-b border-dashed border-gray-200 dark:border-gray-700 pb-2 mb-2">
              {[
                { name: 'Kopi Susu', qty: 2, price: 30000 },
                { name: 'Roti Bakar', qty: 1, price: 12000 },
              ].map(item => (
                <div key={item.name}>
                  <div className="font-semibold text-gray-700 dark:text-gray-200">{item.name}</div>
                  <div className="flex justify-between text-gray-500 dark:text-gray-400 pl-2">
                    <span>{item.qty} × Rp {(item.price / item.qty).toLocaleString('id-ID')}</span>
                    <span>Rp {item.price.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between font-bold text-gray-800 dark:text-gray-100 text-sm py-1">
              <span>TOTAL</span><span>Rp 42.000</span>
            </div>
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Bayar (Tunai)</span><span>Rp 50.000</span>
            </div>
            <div className="flex justify-between text-gray-700 dark:text-gray-300 font-semibold">
              <span>Kembalian</span><span>Rp 8.000</span>
            </div>

            {/* Footer */}
            {(form.footer_msg || form.show_footer_note) && (
              <div className="mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400 space-y-0.5">
                {form.footer_msg
                  ? form.footer_msg.split('\n').map((l, i) => <p key={i}>{l}</p>)
                  : null}
                {form.show_footer_note && (
                  <p className="italic text-gray-400 dark:text-gray-500 text-[10px]">
                    Simpan struk ini sebagai bukti pembelian
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Struk bottom notch */}
          <div className="h-4 bg-white dark:bg-gray-900 flex items-end justify-center overflow-hidden">
            <div className="w-full h-2 border-t-2 border-dashed border-gray-200 dark:border-gray-700" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100">Pengaturan Toko</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Konfigurasi informasi, pembayaran, dan tampilan struk</p>
        </div>
        <button type="submit"
          className="lg:hidden btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
          disabled={saving}>
          {saving
            ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Menyimpan...</>
            : <><Save size={15} />Simpan Pengaturan</>}
        </button>
      </div>

      {/* Body */}
      <div className="flex gap-6 items-start">
        <SectionNav active={active} onChange={setActive} saving={saving} />

        <div className="flex-1 min-w-0">
          {active === 'toko'   && <PanelToko  form={form} set={set} />}
          {active === 'kontak' && <PanelKontak form={form} set={set} />}
          {active === 'qris'   && <PanelQris  form={form} setForm={setForm} />}
          {active === 'bank'   && <PanelBank  form={form} set={set} />}
          {active === 'struk'  && <PanelStruk form={form} set={set} setCheck={setCheck} />}
        </div>
      </div>
    </form>
  )
}
