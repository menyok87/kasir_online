import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { Store, Phone, MapPin, Mail, Globe, FileText, Save, QrCode, Landmark, ImagePlus, X } from 'lucide-react'
import { getSettings, updateSettings, uploadProductImage } from '../api'
import { FullPageSpinner } from '../components/ui/Spinner'
import { getImageUrl } from '../utils/getImageUrl'

const defaultSettings = {
  store_name: '',
  store_tagline: '',
  store_address: '',
  store_phone: '',
  store_email: '',
  store_website: '',
  footer_msg: '',
  show_footer_note: true,
  qris_image: '',
  bank_name: '',
  bank_account_number: '',
  bank_account_name: '',
  bank_branch: '',
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
  const [form, setForm]           = useState(defaultSettings)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [qrisUploading, setQrisUploading] = useState(false)
  const qrisInputRef = useRef(null)

  useEffect(() => {
    getSettings()
      .then(({ data }) => setForm({ ...defaultSettings, ...data }))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const setCheck = k => e => setForm(f => ({ ...f, [k]: e.target.checked }))

  async function handleQrisUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setQrisUploading(true)
    try {
      const { data } = await uploadProductImage(file)
      setForm(f => ({ ...f, qris_image: data.url }))
      toast.success('Gambar QRIS berhasil diupload')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setQrisUploading(false)
    }
  }

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

      {/* QRIS */}
      <Section title="Pembayaran QRIS" icon={QrCode}>
        <p className="text-xs text-gray-500 -mt-2">Upload gambar QR code QRIS toko Anda. Akan ditampilkan saat pelanggan memilih metode QRIS di kasir.</p>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {/* Upload area */}
          <div>
            {form.qris_image ? (
              <div className="relative inline-block">
                <img
                  src={getImageUrl(form.qris_image)}
                  alt="QRIS"
                  className="w-36 h-36 object-contain border-2 border-blue-200 rounded-xl bg-white p-1"
                />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, qris_image: '' }))}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow hover:bg-red-600"
                >
                  <X size={11} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => qrisInputRef.current?.click()}
                disabled={qrisUploading}
                className="flex flex-col items-center justify-center w-36 h-36 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-400 hover:text-blue-500 disabled:opacity-50"
              >
                {qrisUploading ? (
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ImagePlus size={24} />
                    <span className="text-xs mt-1 text-center px-2">Upload QR Code</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={qrisInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleQrisUpload}
            />
            {form.qris_image && (
              <button type="button" onClick={() => qrisInputRef.current?.click()} className="mt-1.5 text-xs text-blue-600 hover:underline block text-center w-36">
                Ganti gambar
              </button>
            )}
          </div>
          <div className="flex-1 text-sm text-gray-500 space-y-1.5 pt-1">
            <p className="font-medium text-gray-600">Cara penggunaan:</p>
            <p>1. Dapatkan file QR code QRIS dari bank/aplikasi pembayaran Anda</p>
            <p>2. Upload di sini (JPG/PNG, maks 3MB)</p>
            <p>3. Saat kasir memilih "QRIS", QR code akan muncul untuk dipindai pelanggan</p>
          </div>
        </div>
      </Section>

      {/* Bank Transfer */}
      <Section title="Rekening Bank Transfer" icon={Landmark}>
        <p className="text-xs text-gray-500 -mt-2">Informasi rekening akan ditampilkan saat pelanggan memilih metode Transfer Bank.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nama Bank">
            <input className="input" value={form.bank_name} onChange={set('bank_name')} placeholder="Contoh: BCA, BRI, Mandiri, BNI" />
          </Field>
          <Field label="Nomor Rekening">
            <input className="input font-mono" value={form.bank_account_number} onChange={set('bank_account_number')} placeholder="1234567890" />
          </Field>
          <Field label="Nama Pemilik Rekening">
            <input className="input" value={form.bank_account_name} onChange={set('bank_account_name')} placeholder="Nama sesuai rekening" />
          </Field>
          <Field label="Cabang" hint="(opsional)">
            <input className="input" value={form.bank_branch} onChange={set('bank_branch')} placeholder="Contoh: KCP Sudirman" />
          </Field>
        </div>
        {(form.bank_name || form.bank_account_number) && (
          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm">
            <p className="text-xs text-blue-600 font-medium mb-1">Preview info transfer:</p>
            <p className="font-medium">{form.bank_name || '-'}</p>
            <p className="font-mono text-lg font-bold text-blue-700">{form.bank_account_number || '-'}</p>
            <p className="text-gray-600">a.n. {form.bank_account_name || '-'}</p>
            {form.bank_branch && <p className="text-xs text-gray-400">{form.bank_branch}</p>}
          </div>
        )}
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
