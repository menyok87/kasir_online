import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  BarChart3, Calendar, Wallet, Receipt, TrendingUp, TrendingDown,
  ShoppingBag, Trophy, Percent, Coins, ArrowUpRight, Package,
} from 'lucide-react'
import { getSalesReport, getMonthlyReport } from '../api'
import { FullPageSpinner } from '../components/ui/Spinner'

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
}
function formatPct(n) {
  return `${(Number(n) || 0).toFixed(1)}%`
}
const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
function monthLabel(m) {
  if (!m) return ''
  const [y, mm] = m.split('-')
  return `${MONTH_NAMES[Number(mm) - 1]} ${y}`
}
function thisMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const PAYMENT_LABEL = { cash: 'Tunai', gopay: 'GoPay', qris: 'QRIS', transfer: 'Transfer', card: 'Kartu' }

// ── Kartu KPI ─────────────────────────────────────────────────────────────────
function Kpi({ label, value, sub, icon: Icon, gradient }) {
  return (
    <div className={`rounded-2xl p-4 ${gradient} relative overflow-hidden`}>
      <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/10" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">{label}</span>
          {Icon && <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center"><Icon size={14} className="text-white" /></div>}
        </div>
        <p className="text-xl font-black text-white leading-none">{value}</p>
        {sub && <p className="text-xs text-white/70 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

function Card({ title, icon: Icon, children, right }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-blue-500" />}
          <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">{title}</h3>
        </div>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function Row({ label, value, strong, color }) {
  return (
    <div className={`flex justify-between items-center py-1.5 ${strong ? 'font-bold' : ''}`}>
      <span className={`text-sm ${strong ? 'text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>{label}</span>
      <span className={`text-sm tabular-nums ${color || (strong ? 'text-gray-800 dark:text-gray-100' : 'text-gray-700 dark:text-gray-200')}`}>{value}</span>
    </div>
  )
}

export default function Reports() {
  const [month, setMonth]     = useState(thisMonth())
  const [data, setData]       = useState(null)
  const [monthly, setMonthly] = useState(null)
  const [loading, setLoading] = useState(true)

  const year = month.slice(0, 4)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([getSalesReport(month), getMonthlyReport(year)])
      .then(([s, m]) => { setData(s.data); setMonthly(m.data) })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [month, year])

  useEffect(() => { load() }, [load])

  if (loading && !data) return <FullPageSpinner />

  const s = data?.summary || {}
  const empty = !data || s.transactions === 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-600" /> Laporan Penjualan
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Analisis otomatis dari data transaksi · {monthLabel(month)}</p>
        </div>
        <div className="relative">
          <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="month" className="input pl-9 w-full sm:w-48" value={month} max={thisMonth()}
            onChange={e => setMonth(e.target.value || thisMonth())} />
        </div>
      </div>

      {empty ? (
        <div className="card p-12 text-center text-gray-400">
          <BarChart3 size={36} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-sm">Belum ada penjualan pada {monthLabel(month)}.</p>
          <p className="text-xs mt-1">Pilih bulan lain atau lakukan transaksi di halaman Kasir.</p>
        </div>
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Pendapatan" value={formatRupiah(s.gross_sales)} sub={`${s.transactions} transaksi`} icon={Coins} gradient="bg-gradient-to-br from-blue-500 to-indigo-700" />
            <Kpi label="Rata-rata / Transaksi" value={formatRupiah(s.aov)} sub="AOV" icon={Receipt} gradient="bg-gradient-to-br from-violet-500 to-purple-700" />
            <Kpi label="Laba Kotor" value={formatRupiah(s.gross_profit)} sub={`Margin ${formatPct(s.gross_margin_pct)}`} icon={TrendingUp} gradient="bg-gradient-to-br from-emerald-500 to-green-700" />
            <Kpi label={s.net_profit >= 0 ? 'Laba Bersih' : 'Rugi Bersih'} value={formatRupiah(Math.abs(s.net_profit))} sub="Setelah beban operasional" icon={s.net_profit >= 0 ? ArrowUpRight : TrendingDown} gradient={s.net_profit >= 0 ? 'bg-gradient-to-br from-teal-500 to-cyan-700' : 'bg-gradient-to-br from-red-600 to-rose-700'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Rekap penjualan per metode */}
            <Card title="Rekap Penjualan per Metode" icon={Wallet}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 dark:text-gray-500 text-left border-b border-gray-100 dark:border-gray-800">
                      <th className="py-2 font-medium">Metode</th>
                      <th className="py-2 font-medium text-right">Transaksi</th>
                      <th className="py-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_payment.map(p => (
                      <tr key={p.method} className="border-b border-gray-50 dark:border-gray-800/50">
                        <td className="py-2 font-medium text-gray-700 dark:text-gray-200">{PAYMENT_LABEL[p.method] || p.method}</td>
                        <td className="py-2 text-right tabular-nums text-gray-500 dark:text-gray-400">{p.count}</td>
                        <td className="py-2 text-right tabular-nums font-semibold text-gray-800 dark:text-gray-100">{formatRupiah(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold text-gray-800 dark:text-gray-100">
                      <td className="py-2">Total</td>
                      <td className="py-2 text-right tabular-nums">{s.transactions}</td>
                      <td className="py-2 text-right tabular-nums text-blue-600 dark:text-blue-400">{formatRupiah(s.gross_sales)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>

            {/* Laba rugi sederhana */}
            <Card title="Laporan Laba Rugi" icon={TrendingUp}>
              <Row label="Penjualan kotor" value={formatRupiah(s.subtotal)} />
              {s.discount > 0 && <Row label="Diskon" value={`- ${formatRupiah(s.discount)}`} color="text-rose-500" />}
              {s.tax > 0 && <Row label="Pajak" value={`+ ${formatRupiah(s.tax)}`} />}
              <Row label="Penjualan bersih" value={formatRupiah(s.gross_sales)} strong />
              <Row label="HPP (Harga Pokok Penjualan)" value={`- ${formatRupiah(s.cogs)}`} color="text-orange-500" />
              <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
              <Row label="Laba kotor" value={formatRupiah(s.gross_profit)} strong color="text-emerald-600 dark:text-emerald-400" />
              <Row label="Beban operasional" value={`- ${formatRupiah(s.beban_operasional)}`} color="text-orange-500" />
              <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
              <Row label={s.net_profit >= 0 ? 'Laba bersih' : 'Rugi bersih'} value={formatRupiah(s.net_profit)} strong color={s.net_profit >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-500'} />
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">Beban operasional diambil dari jurnal manual akun beban di Buku Besar.</p>
            </Card>
          </div>

          {/* Produk: top profit & margin terendah */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card title="3 Produk Penyumbang Laba Terbesar" icon={Trophy}>
              {data.top_profit.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Belum ada data.</p> : (
                <div className="space-y-2">
                  {data.top_profit.map((p, i) => (
                    <div key={p.product_id || p.name} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0 ${['bg-amber-400','bg-gray-400','bg-orange-400'][i] || 'bg-gray-300'}`}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.qty} terjual · margin {formatPct(p.margin_pct)}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatRupiah(p.profit)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Produk Margin Terendah" icon={Percent}>
              {data.lowest_margin.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Belum ada data.</p> : (
                <div className="space-y-2">
                  {data.lowest_margin.map(p => (
                    <div key={p.product_id || p.name} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                        <Package size={14} className="text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.qty} terjual · laba {formatRupiah(p.profit)}</p>
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${p.margin_pct < 15 ? 'text-red-500' : 'text-orange-500'}`}>{formatPct(p.margin_pct)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Tabel produk lengkap */}
          <Card title="Rincian per Produk" icon={ShoppingBag} right={<span className="text-xs text-gray-400">{data.by_product.length} produk</span>}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 dark:text-gray-500 text-left border-b border-gray-100 dark:border-gray-800">
                    <th className="py-2 font-medium">Produk</th>
                    <th className="py-2 font-medium text-right">Qty</th>
                    <th className="py-2 font-medium text-right">Pendapatan</th>
                    <th className="py-2 font-medium text-right">HPP</th>
                    <th className="py-2 font-medium text-right">Laba</th>
                    <th className="py-2 font-medium text-right">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_product.map(p => (
                    <tr key={p.product_id || p.name} className="border-b border-gray-50 dark:border-gray-800/50">
                      <td className="py-2 font-medium text-gray-700 dark:text-gray-200">{p.name}</td>
                      <td className="py-2 text-right tabular-nums text-gray-500 dark:text-gray-400">{p.qty}</td>
                      <td className="py-2 text-right tabular-nums">{formatRupiah(p.revenue)}</td>
                      <td className="py-2 text-right tabular-nums text-gray-400">{formatRupiah(p.cogs)}</td>
                      <td className="py-2 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{formatRupiah(p.profit)}</td>
                      <td className="py-2 text-right tabular-nums">{formatPct(p.margin_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Rekap mingguan */}
          {data.weekly.length > 0 && (
            <Card title="Rekap Mingguan" icon={Calendar}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 dark:text-gray-500 text-left border-b border-gray-100 dark:border-gray-800">
                      <th className="py-2 font-medium">Minggu</th>
                      <th className="py-2 font-medium text-right">Transaksi</th>
                      <th className="py-2 font-medium text-right">Penjualan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.weekly.map(w => (
                      <tr key={w.week} className="border-b border-gray-50 dark:border-gray-800/50">
                        <td className="py-2 font-medium text-gray-700 dark:text-gray-200">{w.label}</td>
                        <td className="py-2 text-right tabular-nums text-gray-500 dark:text-gray-400">{w.count}</td>
                        <td className="py-2 text-right tabular-nums font-semibold text-gray-800 dark:text-gray-100">{formatRupiah(w.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Tren bulanan + proyeksi (selalu tampil) */}
      {monthly && (
        <Card title={`Tren Penjualan ${monthly.year}`} icon={TrendingUp}
          right={monthly.projection.next_month_estimate > 0 && (
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              Proyeksi: {formatRupiah(monthly.projection.next_month_estimate)}
            </span>
          )}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 dark:text-gray-500 text-left border-b border-gray-100 dark:border-gray-800">
                  <th className="py-2 font-medium">Bulan</th>
                  <th className="py-2 font-medium text-right">Transaksi</th>
                  <th className="py-2 font-medium text-right">Penjualan</th>
                  <th className="py-2 font-medium text-right">Laba Kotor</th>
                </tr>
              </thead>
              <tbody>
                {monthly.months.filter(m => m.transactions > 0).map(m => (
                  <tr key={m.month}
                    className={`border-b border-gray-50 dark:border-gray-800/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 ${m.month === month ? 'bg-blue-50/60 dark:bg-blue-900/10' : ''}`}
                    onClick={() => setMonth(m.month)}>
                    <td className="py-2 font-medium text-gray-700 dark:text-gray-200">{monthLabel(m.month)}</td>
                    <td className="py-2 text-right tabular-nums text-gray-500 dark:text-gray-400">{m.transactions}</td>
                    <td className="py-2 text-right tabular-nums font-semibold text-gray-800 dark:text-gray-100">{formatRupiah(m.gross_sales)}</td>
                    <td className="py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{formatRupiah(m.gross_profit)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold text-gray-800 dark:text-gray-100 border-t-2 border-gray-200 dark:border-gray-700">
                  <td className="py-2">Total {monthly.year}</td>
                  <td className="py-2 text-right tabular-nums">{monthly.total.transactions}</td>
                  <td className="py-2 text-right tabular-nums text-blue-600 dark:text-blue-400">{formatRupiah(monthly.total.gross_sales)}</td>
                  <td className="py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{formatRupiah(monthly.total.gross_profit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {monthly.projection.next_month_estimate > 0 && (
            <div className="mt-3 flex items-start gap-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3">
              <TrendingUp size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                <strong>Proyeksi bulan depan ≈ {formatRupiah(monthly.projection.next_month_estimate)}</strong><br />
                Metode: {monthly.projection.method} ({monthly.projection.based_on.map(monthLabel).join(', ')}).
                Estimasi sederhana, bukan jaminan.
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
