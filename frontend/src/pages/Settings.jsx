import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Store, Phone, MapPin, Mail, Globe, FileText, Save } from 'lucide-react'
import { getSettings, updateSettings } from '../api'
import { FullPageSpinner } from '../components/ui/Spinner'

const defaultSettings = {
  store_name: '',
  store_tagline: '',
  store_address: '',
  store_phone: '',
  store_email: '',
  store_website: '',
  footer_msg: '',
  show_footer_note: true,
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card mb-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
        <div className="p-1.5 bg-blue-50 rounded-lg">
          <Icon size={16} className="text-blue-600" />
        </div>
        <h3 className="font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {hint && <span className="ml-1 text-xs text-gray-400 font-normal">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

export default function Settings() {
  const [form, setForm]       = useState(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    getSettings()
      .then(({ data }) => setForm({ ...defaultSettings, ...data }))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
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
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <FullPageSpinner />

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-800">Pengaturan Toko</h2>
          <p className="text-sm text-gray-500 mt-0.5">Konfigurasi informasi toko dan tampilan struk</p>
        </div>
        <button type="submit" className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto" disabled={saving}>
          <Save size={16} />
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>

      {/* Info Toko */}
      <Section title="Informasi Toko" icon={Store}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Nama Toko" hint="(wajib)">
              <input
                className="input"
                value={form.store_name}
                onChange={set('store_name')}
                required
                placeholder="Contoh: Warung Maju Jaya"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Tagline / Slogan">
              <input
                className="input"
                value={form.store_tagline}
                onChange={set('store_tagline')}
                placeholder="Contoh: Belanja Mudah & Murah"
              />
            </Field>
          </div>
        </div>
      </Section>

      {/* Kontak */}
      <Section title="Kontak & Alamat" icon={MapPin}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Alamat Toko">
              <textarea
                className="input resize-none"
                rows={2}
                value={form.store_address}
                onChange={set('store_address')}
                placeholder="Jl. Contoh No. 1, Kecamatan, Kota"
              />
            </Field>
          </div>
          <Field label="Nomor Telepon">
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-8"
                value={form.store_phone}
                onChange={set('store_phone')}
                placeholder="0812-3456-7890"
              />
            </div>
          </Field>
          <Field label="Email">
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-8"
                type="email"
                value={form.store_email}
                onChange={set('store_email')}
                placeholder="toko@email.com"
              />
            </div>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Website">
              <div className="relative">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="input pl-8"
                  value={form.store_website}
                  onChange={set('store_website')}
                  placeholder="www.tokosaya.com"
                />
              </div>
            </Field>
          </div>
        </div>
      </Section>

      {/* Pengaturan Struk */}
      <Section title="Pengaturan Struk" icon={FileText}>
        <Field label="Pesan Footer Struk" hint="(tampil di bawah struk)">
          <textarea
            className="input resize-none"
            rows={3}
            value={form.footer_msg}
            onChange={set('footer_msg')}
            placeholder="Terima kasih telah berbelanja!&#10;Barang yang sudah dibeli tidak dapat dikembalikan."
          />
          <p className="text-xs text-gray-400 mt-1">Gunakan Enter untuk baris baru.</p>
        </Field>
        <div className="flex items-center gap-3">
          <input
            id="show_note"
            type="checkbox"
            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
            checked={form.show_footer_note}
            onChange={setCheck('show_footer_note')}
          />
          <label htmlFor="show_note" className="text-sm text-gray-700 cursor-pointer select-none">
            Tampilkan catatan "Simpan struk ini sebagai bukti pembelian"
          </label>
        </div>
      </Section>

      {/* Preview Struk */}
      <div className="card bg-gray-50">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
          <FileText size={16} className="text-gray-500" />
          <h3 className="font-semibold text-gray-600 text-sm">Preview Header Struk</h3>
        </div>
        <div className="font-mono text-xs text-center space-y-0.5 text-gray-700">
          <p className="font-bold text-sm tracking-wider uppercase">{form.store_name || 'NAMA TOKO'}</p>
          {form.store_tagline && <p className="text-gray-500">{form.store_tagline}</p>}
          {form.store_address && <p>{form.store_address}</p>}
          {form.store_phone   && <p>Telp: {form.store_phone}</p>}
          {form.store_email   && <p>{form.store_email}</p>}
          {form.store_website && <p>{form.store_website}</p>}
          <p className="mt-1 border-t border-dashed border-gray-400 pt-1">——— *** ———</p>
          {form.footer_msg && (
            <div className="mt-2 text-gray-500">
              {form.footer_msg.split('\n').map((l, i) => <p key={i}>{l}</p>)}
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
