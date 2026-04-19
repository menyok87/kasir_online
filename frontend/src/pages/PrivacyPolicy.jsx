import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Store, ArrowLeft, Shield, Database, Lock, Users, RefreshCw, Baby, Mail, ChevronRight } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

const SECTIONS = [
  { id: 's1', title: 'Informasi yang Kami Kumpulkan',  icon: Database,   color: 'blue'   },
  { id: 's2', title: 'Cara Kami Menggunakan Informasi', icon: Shield,     color: 'teal'   },
  { id: 's3', title: 'Penyimpanan & Keamanan Data',     icon: Lock,       color: 'violet' },
  { id: 's4', title: 'Berbagi Data dengan Pihak Ketiga',icon: Users,      color: 'amber'  },
  { id: 's5', title: 'Hak Pengguna',                    icon: Shield,     color: 'green'  },
  { id: 's6', title: 'Data Anak-anak',                  icon: Baby,       color: 'pink'   },
  { id: 's7', title: 'Perubahan Kebijakan',             icon: RefreshCw,  color: 'orange' },
  { id: 's8', title: 'Hubungi Kami',                    icon: Mail,       color: 'indigo' },
]

const COLOR = {
  blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',     text: 'text-blue-600 dark:text-blue-400',   border: 'border-blue-200 dark:border-blue-800',   heading: 'text-blue-700 dark:text-blue-300'   },
  teal:   { bg: 'bg-teal-50 dark:bg-teal-900/20',     text: 'text-teal-600 dark:text-teal-400',   border: 'border-teal-200 dark:border-teal-800',   heading: 'text-teal-700 dark:text-teal-300'   },
  violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400',border: 'border-violet-200 dark:border-violet-800',heading: 'text-violet-700 dark:text-violet-300'},
  amber:  { bg: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', heading: 'text-amber-700 dark:text-amber-300' },
  green:  { bg: 'bg-green-50 dark:bg-green-900/20',   text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800', heading: 'text-green-700 dark:text-green-300' },
  pink:   { bg: 'bg-pink-50 dark:bg-pink-900/20',     text: 'text-pink-600 dark:text-pink-400',   border: 'border-pink-200 dark:border-pink-800',   heading: 'text-pink-700 dark:text-pink-300'   },
  orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400',border: 'border-orange-200 dark:border-orange-800',heading: 'text-orange-700 dark:text-orange-300'},
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400',border: 'border-indigo-200 dark:border-indigo-800',heading: 'text-indigo-700 dark:text-indigo-300'},
}

function SectionCard({ id, num, title, icon: Icon, color, children }) {
  const c = COLOR[color]
  return (
    <div id={id} className="card p-6 md:p-8 scroll-mt-6">
      <div className="flex items-center gap-4 mb-6 pb-5 border-b border-gray-100 dark:border-gray-800">
        <div className={`w-10 h-10 rounded-2xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} className={c.text} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">
            Pasal {num}
          </p>
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 leading-tight">{title}</h2>
        </div>
      </div>
      <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {children}
      </div>
    </div>
  )
}

function InfoBox({ color = 'blue', children }) {
  const c = COLOR[color]
  return (
    <div className={`flex gap-3 ${c.bg} border ${c.border} rounded-xl px-4 py-3`}>
      <span className="text-lg flex-shrink-0">ℹ️</span>
      <p className={`text-sm ${c.heading} font-medium`}>{children}</p>
    </div>
  )
}

function WarnBox({ children }) {
  return (
    <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
      <span className="text-lg flex-shrink-0">⚠️</span>
      <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">{children}</p>
    </div>
  )
}

function DataTable({ rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
            {['Jenis Data', 'Contoh', 'Tujuan'].map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              {r.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-gray-600 dark:text-gray-400 align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BulletList({ items }) {
  return (
    <ul className="space-y-1.5 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="text-blue-500 mt-1 flex-shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function PrivacyPolicy() {
  const { dark, toggle } = useTheme()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const scrollTo = id => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">

      {/* ── Header ── */}
      <header className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
          <div className="flex items-center justify-between mb-8">
            <Link to="/login"
              className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors">
              <ArrowLeft size={16} />
              Kembali ke Login
            </Link>
            <button onClick={toggle}
              className="text-white/70 hover:text-white text-sm transition-colors">
              {dark ? '☀️' : '🌙'}
            </button>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-black/20">
              <Store size={28} className="text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Kebijakan Privasi</h1>
            <p className="text-white/70 text-sm md:text-base">Kasir Online — Aplikasi Point of Sale</p>
            <div className="mt-4 inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 text-xs font-semibold px-4 py-2 rounded-full">
              <Shield size={12} />
              Berlaku sejak 19 April 2026
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── Sidebar TOC (desktop) ── */}
          <aside className="hidden lg:block w-56 flex-shrink-0 sticky top-6">
            <div className="card p-4">
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Daftar Isi</p>
              <nav className="space-y-0.5">
                {SECTIONS.map((s, i) => {
                  const c = COLOR[s.color]
                  return (
                    <button key={s.id} onClick={() => scrollTo(s.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all group">
                      <s.icon size={13} className={`${c.text} flex-shrink-0`} />
                      <span className="truncate leading-tight">{s.title}</span>
                      <ChevronRight size={11} className="ml-auto opacity-0 group-hover:opacity-50 flex-shrink-0" />
                    </button>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* ── Content ── */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* Intro card */}
            <div className="card p-5 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30">
              <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                Kasir Online (<strong>"kami"</strong>) berkomitmen melindungi privasi Anda.
                Kebijakan ini menjelaskan jenis data yang kami kumpulkan, cara penggunaannya,
                dan hak-hak Anda sebagai pengguna. Dengan menggunakan aplikasi ini, Anda
                menyetujui kebijakan privasi berikut.
              </p>
            </div>

            {/* S1 */}
            <SectionCard id="s1" num={1} title="Informasi yang Kami Kumpulkan" icon={Database} color="blue">
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">a. Data Akun</h3>
                <BulletList items={[
                  'Nama lengkap pemilik / pengelola usaha',
                  'Nama toko / usaha',
                  'Username (dibuat sendiri oleh pengguna)',
                  'Password (tersimpan terenkripsi — tidak bisa dibaca)',
                  'Peran pengguna (Admin, Supervisor, Kasir)',
                ]} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">b. Data Bisnis</h3>
                <DataTable rows={[
                  ['Data Produk',     'Nama, harga, kategori, foto produk',       'Ditampilkan di kasir (POS)'],
                  ['Data Transaksi',  'Item terjual, jumlah, metode bayar, waktu', 'Riwayat penjualan & laporan'],
                  ['Pengaturan Toko', 'Nama, alamat, logo, foto QRIS',             'Ditampilkan di struk'],
                  ['Data Keuangan',   'Daftar akun: kas, bank, pendapatan, dst.',  'Laporan keuangan'],
                ]} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">c. Data Teknis</h3>
                <BulletList items={[
                  'Token autentikasi JWT (disimpan di perangkat untuk sesi login)',
                  'Waktu transaksi (timestamp)',
                ]} />
              </div>
              <InfoBox color="blue">
                Kami <strong>tidak</strong> mengumpulkan lokasi, kontak perangkat, riwayat panggilan, atau sensor perangkat Anda.
              </InfoBox>
            </SectionCard>

            {/* S2 */}
            <SectionCard id="s2" num={2} title="Cara Kami Menggunakan Informasi" icon={Shield} color="teal">
              <p>Data yang dikumpulkan digunakan semata-mata untuk:</p>
              <BulletList items={[
                'Menjalankan fitur aplikasi kasir (POS, manajemen produk, laporan)',
                'Memverifikasi identitas pengguna saat login',
                'Menyimpan riwayat transaksi dan laporan keuangan',
                'Mencetak atau mengunduh struk pembayaran',
                'Menampilkan data yang Anda input di berbagai halaman aplikasi',
              ]} />
              <InfoBox color="teal">
                Kami <strong>tidak</strong> menggunakan data Anda untuk iklan, profiling, atau keperluan di luar operasional aplikasi kasir.
              </InfoBox>
            </SectionCard>

            {/* S3 */}
            <SectionCard id="s3" num={3} title="Penyimpanan & Keamanan Data" icon={Lock} color="violet">
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Lokasi Penyimpanan</h3>
                <p>
                  Seluruh data bisnis Anda disimpan di <strong className="text-gray-800 dark:text-gray-200">server yang Anda kontrol</strong>.
                  Kasir Online beroperasi dengan model dedicated server — data Anda tidak bercampur dengan pengguna lain.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Langkah Keamanan</h3>
                <BulletList items={[
                  'Password dienkripsi dengan bcrypt (hashing satu arah — tidak dapat didekripsi)',
                  'Komunikasi antara aplikasi dan server menggunakan HTTPS',
                  'Autentikasi via JSON Web Token (JWT) dengan masa berlaku 8 jam',
                  'Akses data dibatasi sesuai peran pengguna (Admin, Supervisor, Kasir)',
                ]} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Retensi Data</h3>
                <p>
                  Data Anda disimpan selama akun aktif. Jika Anda menghentikan layanan,
                  data dapat dihapus permanen atas permintaan.
                </p>
              </div>
              <WarnBox>
                Keamanan data juga bergantung pada kekuatan password Anda. Gunakan minimal 8 karakter dengan kombinasi huruf dan angka.
              </WarnBox>
            </SectionCard>

            {/* S4 */}
            <SectionCard id="s4" num={4} title="Berbagi Data dengan Pihak Ketiga" icon={Users} color="amber">
              <p>
                Kami <strong className="text-gray-800 dark:text-gray-200">tidak menjual, menyewakan, atau berbagi</strong> data
                pribadi Anda kepada pihak ketiga untuk tujuan komersial.
              </p>
              <p>Data Anda hanya dapat dibagikan dalam situasi berikut:</p>
              <BulletList items={[
                'Atas permintaan Anda sendiri — misalnya mengekspor laporan atau struk',
                'Kewajiban hukum — jika diwajibkan oleh peraturan perundang-undangan yang berlaku di Indonesia',
              ]} />
              <InfoBox color="amber">
                Aplikasi ini <strong>tidak menggunakan</strong> layanan pihak ketiga seperti Google Analytics, Firebase, Facebook SDK, atau jaringan iklan apapun.
              </InfoBox>
            </SectionCard>

            {/* S5 */}
            <SectionCard id="s5" num={5} title="Hak Pengguna" icon={Shield} color="green">
              <p>Sebagai pengguna, Anda berhak untuk:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: '👁', title: 'Akses Data', desc: 'Lihat semua data Anda melalui antarmuka aplikasi' },
                  { icon: '✏️', title: 'Koreksi Data', desc: 'Ubah informasi akun, produk, atau pengaturan kapan saja' },
                  { icon: '🗑', title: 'Hapus Data', desc: 'Hapus produk, transaksi, atau akun melalui aplikasi' },
                  { icon: '📥', title: 'Ekspor Data', desc: 'Unduh laporan dalam format yang tersedia di aplikasi' },
                ].map(r => (
                  <div key={r.title} className="flex items-start gap-3 bg-green-50 dark:bg-green-900/10 rounded-xl p-3 border border-green-100 dark:border-green-900/30">
                    <span className="text-xl flex-shrink-0">{r.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-700 dark:text-gray-200 text-sm">{r.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p>Untuk penghapusan data secara lengkap (termasuk data server), silakan hubungi kami.</p>
            </SectionCard>

            {/* S6 */}
            <SectionCard id="s6" num={6} title="Data Anak-anak" icon={Baby} color="pink">
              <p>
                Aplikasi Kasir Online ditujukan untuk pelaku usaha dewasa. Kami tidak secara
                sengaja mengumpulkan data dari anak-anak di bawah usia 13 tahun.
              </p>
              <p>
                Jika Anda mengetahui bahwa anak di bawah umur telah mendaftarkan akun tanpa
                izin, segera hubungi kami untuk menghapus data tersebut.
              </p>
            </SectionCard>

            {/* S7 */}
            <SectionCard id="s7" num={7} title="Perubahan Kebijakan Privasi" icon={RefreshCw} color="orange">
              <p>
                Kami dapat memperbarui kebijakan ini dari waktu ke waktu. Setiap perubahan
                akan dicantumkan di halaman ini dengan tanggal pembaruan yang baru.
              </p>
              <p>
                Jika terjadi perubahan signifikan, kami akan memberikan pemberitahuan melalui
                aplikasi. Kelanjutan penggunaan berarti Anda menyetujui kebijakan yang diperbarui.
              </p>
              <InfoBox color="orange">
                Terakhir diperbarui: <strong>19 April 2026</strong>
              </InfoBox>
            </SectionCard>

            {/* S8 */}
            <SectionCard id="s8" num={8} title="Hubungi Kami" icon={Mail} color="indigo">
              <p>
                Jika Anda memiliki pertanyaan, kekhawatiran, atau permintaan terkait kebijakan
                privasi ini, silakan hubungi kami:
              </p>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-5 space-y-3">
                {[
                  { label: 'Aplikasi',  value: 'Kasir Online — Point of Sale' },
                  { label: 'Website',   value: 'kasir.keuangan99.com', href: 'https://kasir.keuangan99.com' },
                  { label: 'Email',     value: 'support@keuangan99.com', href: 'mailto:support@keuangan99.com' },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-3">
                    <span className="w-20 text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide flex-shrink-0">{r.label}</span>
                    {r.href
                      ? <a href={r.href} className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:underline">{r.value}</a>
                      : <span className="text-sm text-gray-700 dark:text-gray-300">{r.value}</span>
                    }
                  </div>
                ))}
              </div>
              <p className="text-gray-500 dark:text-gray-500">
                Kami akan merespons permintaan Anda dalam waktu paling lambat <strong className="text-gray-700 dark:text-gray-300">7 hari kerja</strong>.
              </p>
            </SectionCard>

            {/* Footer */}
            <div className="text-center py-8 border-t border-gray-200 dark:border-gray-800">
              <div className="inline-flex items-center gap-2 text-gray-400 dark:text-gray-600 text-sm">
                <Store size={14} />
                <span>© 2026 Kasir Online. Seluruh hak dilindungi.</span>
              </div>
              <div className="mt-3">
                <Link to="/login"
                  className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
                  <ArrowLeft size={14} />
                  Kembali ke Halaman Login
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
