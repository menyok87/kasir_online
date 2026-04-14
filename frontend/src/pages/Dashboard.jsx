import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { TrendingUp, ShoppingBag, Package, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getDashboardSummary, getDashboardChart } from '../api'
import { FullPageSpinner } from '../components/ui/Spinner'

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  }
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-1 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 text-sm">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="font-bold text-gray-800">{formatRupiah(payload[0].value)}</p>
      <p className="text-gray-400">{payload[1]?.value || 0} transaksi</p>
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
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Pendapatan Hari Ini"
          value={formatRupiah(summary?.today_revenue || 0)}
          sub="Total semua transaksi hari ini"
          color="blue"
        />
        <StatCard
          icon={ShoppingBag}
          label="Transaksi Hari Ini"
          value={summary?.today_orders || 0}
          sub="Jumlah transaksi selesai"
          color="green"
        />
        <StatCard
          icon={Package}
          label="Total Produk"
          value={summary?.total_products || 0}
          sub="Produk aktif tersedia"
          color="purple"
        />
        <StatCard
          icon={AlertTriangle}
          label="Stok Menipis"
          value={summary?.low_stock_count || 0}
          sub="Produk dengan stok ≤ 5"
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="card xl:col-span-2">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Pendapatan 7 Hari Terakhir</h3>
          {chartData.every(d => d.revenue === 0) ? (
            <div className="flex items-center justify-center h-56 text-gray-400 text-sm">
              Belum ada transaksi
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Pendapatan" />
                <Bar dataKey="orders" fill="#e0e7ff" radius={[4, 4, 0, 0]} name="Transaksi" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Products */}
        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Produk Terlaris Hari Ini</h3>
          {!summary?.top_products?.length ? (
            <p className="text-sm text-gray-400 text-center py-8">Belum ada transaksi hari ini</p>
          ) : (
            <div className="space-y-3">
              {summary.top_products.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.product_name}</p>
                    <p className="text-xs text-gray-400">{p.total_qty} terjual</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 flex-shrink-0">
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
