import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { TrendingUp, ShoppingBag, Package, AlertTriangle } from 'lucide-react'
import { getDashboardSummary, getDashboardChart } from '../api'
import { FullPageSpinner } from '../components/ui/Spinner'

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

// Grafik batang ringan (CSS) — pengganti recharts, hemat memori & bundle
function RevenueChart({ data }) {
  const max = Math.max(...data.map(d => d.revenue), 1)
  return (
    <div className="h-[200px] flex items-end gap-2 md:gap-3 pt-6">
      {data.map((d, i) => {
        const pct = Math.max(3, Math.round((d.revenue / max) * 100))
        return (
          <div key={i} className="group relative flex-1 h-full flex flex-col items-center justify-end">
            <div className="pointer-events-none absolute bottom-full mb-1 z-10 hidden group-hover:block whitespace-nowrap
              bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 px-2.5 py-1.5 text-xs">
              <div className="font-bold text-gray-800 dark:text-gray-100">{formatRupiah(d.revenue)}</div>
              <div className="text-gray-400 dark:text-gray-500">{d.orders} transaksi</div>
            </div>
            <div className="w-full max-w-[38px] rounded-t-lg bg-gradient-to-t from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 transition-colors"
              style={{ height: `${pct}%` }} />
            <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 whitespace-nowrap">{d.date}</span>
          </div>
        )
      })}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    green:  'bg-green-50 dark:bg-green-900/20 text-green-600',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600',
  }
  return (
    <div className="card flex items-start gap-3 p-4 md:p-6">
      <div className={`p-2.5 md:p-3 rounded-xl flex-shrink-0 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 hidden sm:block">{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [chart, setChart]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [{ data: s }, { data: c }] = await Promise.all([
          getDashboardSummary(),
          getDashboardChart(7),
        ])
        setSummary(s)
        setChart(c)
      } catch (err) {
        toast.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <FullPageSpinner />

  const chartData = chart.map(row => ({
    date: new Date(row.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
    revenue: row.revenue,
    orders: row.orders,
  }))

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stat Cards — 2 kolom di mobile, 4 di desktop */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon={TrendingUp}    label="Pendapatan Hari Ini" value={formatRupiah(summary?.today_revenue || 0)} sub="Total transaksi hari ini" color="blue" />
        <StatCard icon={ShoppingBag}   label="Transaksi Hari Ini"  value={summary?.today_orders || 0}               sub="Jumlah transaksi selesai" color="green" />
        <StatCard icon={Package}       label="Total Produk"         value={summary?.total_products || 0}             sub="Produk aktif tersedia"   color="purple" />
        <StatCard icon={AlertTriangle} label="Stok Menipis"         value={summary?.low_stock_count || 0}            sub="Produk stok ≤ 5"         color="yellow" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        {/* Chart */}
        <div className="card p-4 md:p-6 xl:col-span-2">
          <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 mb-3 md:mb-4">
            Pendapatan 7 Hari Terakhir
          </h3>
          {chartData.every(d => d.revenue === 0) ? (
            <div className="flex items-center justify-center h-44 text-gray-400 dark:text-gray-500 text-sm">
              Belum ada transaksi
            </div>
          ) : (
            <RevenueChart data={chartData} />
          )}
        </div>

        {/* Top Products */}
        <div className="card p-4 md:p-6">
          <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 mb-3 md:mb-4">
            Produk Terlaris Hari Ini
          </h3>
          {!summary?.top_products?.length ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Belum ada transaksi hari ini</p>
          ) : (
            <div className="space-y-3">
              {summary.top_products.map((p, i) => (
                <div key={i} className="flex items-center gap-2 md:gap-3">
                  <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{p.product_name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{p.total_qty} terjual</p>
                  </div>
                  <span className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 flex-shrink-0">
                    {formatRupiah(p.total_revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
