const express = require('express')
const router  = express.Router()
const pool    = require('../database/db')
const { authenticate, requireManager, tenantId } = require('../middleware/authMiddleware')

const n = v => Number(v) || 0
const isMonth = s => /^\d{4}-\d{2}$/.test(s)
const isYear  = s => /^\d{4}$/.test(s)
function thisMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Hanya transaksi penjualan yang sah: non-GoPay langsung sah,
// GoPay hanya bila sudah settlement (lunas).
const VALID_SALE = `(t.payment_method <> 'gopay' OR t.gopay_status = 'settlement')`

// GET /api/reports/sales?month=YYYY-MM — laporan penjualan satu bulan
router.get('/sales', authenticate, requireManager, async (req, res, next) => {
  try {
    const tid   = tenantId(req.user)
    const month = isMonth(req.query.month) ? req.query.month : thisMonth()
    const start = `${month}-01`
    const p     = [tid, start]
    const range = `t.created_at >= $2::date AND t.created_at < $2::date + INTERVAL '1 month'`

    // 1) Ringkasan transaksi
    const { rows: sumRows } = await pool.query(
      `SELECT COUNT(*)::int AS transactions,
              COALESCE(SUM(t.subtotal),0)    AS subtotal,
              COALESCE(SUM(t.discount),0)    AS discount,
              COALESCE(SUM(t.tax),0)         AS tax,
              COALESCE(SUM(t.grand_total),0) AS gross_sales
         FROM transactions t
        WHERE t.admin_id = $1 AND ${range} AND ${VALID_SALE}`, p)
    const sm = sumRows[0]

    // 2) Item: HPP & jumlah terjual
    const { rows: itemRows } = await pool.query(
      `SELECT COALESCE(SUM(ti.quantity),0)::int             AS items_sold,
              COALESCE(SUM(ti.cost_price * ti.quantity),0)  AS cogs,
              COALESCE(SUM(ti.subtotal),0)                  AS item_revenue
         FROM transaction_items ti
         JOIN transactions t ON t.id = ti.transaction_id
        WHERE t.admin_id = $1 AND ${range} AND ${VALID_SALE}`, p)
    const it = itemRows[0]

    // 3) Per metode pembayaran
    const { rows: byPayment } = await pool.query(
      `SELECT t.payment_method AS method, COUNT(*)::int AS count,
              COALESCE(SUM(t.grand_total),0) AS total
         FROM transactions t
        WHERE t.admin_id = $1 AND ${range} AND ${VALID_SALE}
        GROUP BY t.payment_method ORDER BY total DESC`, p)

    // 4) Per produk (pendapatan, HPP, laba, margin)
    const { rows: byProductRaw } = await pool.query(
      `SELECT ti.product_id, ti.product_name AS name, ti.product_sku AS sku,
              SUM(ti.quantity)::int AS qty,
              COALESCE(SUM(ti.subtotal),0) AS revenue,
              COALESCE(SUM(ti.cost_price * ti.quantity),0) AS cogs
         FROM transaction_items ti
         JOIN transactions t ON t.id = ti.transaction_id
        WHERE t.admin_id = $1 AND ${range} AND ${VALID_SALE}
        GROUP BY ti.product_id, ti.product_name, ti.product_sku`, p)

    const byProduct = byProductRaw.map(r => {
      const revenue = n(r.revenue), cogs = n(r.cogs)
      const profit  = revenue - cogs
      return {
        product_id: r.product_id, name: r.name, sku: r.sku, qty: n(r.qty),
        revenue, cogs, profit,
        margin_pct: revenue > 0 ? (profit / revenue) * 100 : 0,
      }
    })

    // 5) Beban operasional (jurnal manual ke akun beban) di bulan ini
    const { rows: bebanRows } = await pool.query(
      `SELECT COALESCE(SUM(je.debit - je.credit),0) AS beban
         FROM journal_entries je
         JOIN accounts a ON a.id = je.account_id
        WHERE je.admin_id = $1 AND a.type = 'beban'
          AND je.entry_date >= $2::date AND je.entry_date < $2::date + INTERVAL '1 month'`, p)
    const bebanOperasional = n(bebanRows[0].beban)

    // 6) Harian (untuk tren & rekap mingguan)
    const { rows: daily } = await pool.query(
      `SELECT to_char(t.created_at,'YYYY-MM-DD') AS date, COUNT(*)::int AS count,
              COALESCE(SUM(t.grand_total),0) AS total
         FROM transactions t
        WHERE t.admin_id = $1 AND ${range} AND ${VALID_SALE}
        GROUP BY date ORDER BY date`, p)

    // Rekap mingguan (minggu ke-berapa dalam bulan)
    const weekMap = {}
    for (const d of daily) {
      const day  = Number(d.date.slice(8, 10))
      const week = Math.floor((day - 1) / 7) + 1
      if (!weekMap[week]) weekMap[week] = { week, label: `Minggu ${week}`, total: 0, count: 0 }
      weekMap[week].total += n(d.total)
      weekMap[week].count += n(d.count)
    }
    const weekly = Object.values(weekMap).sort((a, b) => a.week - b.week)

    // Hitung turunan
    const grossSales = n(sm.gross_sales)
    const cogs       = n(it.cogs)
    const grossProfit = grossSales - cogs
    const netProfit   = grossProfit - bebanOperasional
    const transactions = n(sm.transactions)
    const aov = transactions > 0 ? grossSales / transactions : 0

    const sortedByProfit = [...byProduct].sort((a, b) => b.profit - a.profit)
    const withRevenue    = byProduct.filter(p => p.revenue > 0)
    const lowestMargin   = [...withRevenue].sort((a, b) => a.margin_pct - b.margin_pct).slice(0, 3)
    const bestSellers    = [...byProduct].sort((a, b) => b.qty - a.qty)

    res.json({
      period: { month, label: month },
      summary: {
        gross_sales: grossSales,
        subtotal: n(sm.subtotal),
        discount: n(sm.discount),
        tax: n(sm.tax),
        cogs,
        gross_profit: grossProfit,
        beban_operasional: bebanOperasional,
        net_profit: netProfit,
        transactions,
        items_sold: n(it.items_sold),
        aov,
        gross_margin_pct: grossSales > 0 ? (grossProfit / grossSales) * 100 : 0,
      },
      by_payment: byPayment.map(r => ({ method: r.method, count: n(r.count), total: n(r.total) })),
      by_product: sortedByProfit,
      best_sellers: bestSellers.slice(0, 10),
      top_profit: sortedByProfit.slice(0, 3),
      lowest_margin: lowestMargin,
      weekly,
      daily: daily.map(d => ({ date: d.date, count: n(d.count), total: n(d.total) })),
    })
  } catch (err) { next(err) }
})

// GET /api/reports/monthly?year=YYYY — tren 12 bulan + proyeksi bulan depan
router.get('/monthly', authenticate, requireManager, async (req, res, next) => {
  try {
    const tid   = tenantId(req.user)
    const year  = isYear(req.query.year) ? req.query.year : String(new Date().getFullYear())
    const start = `${year}-01-01`
    const p     = [tid, start]
    const range = `t.created_at >= $2::date AND t.created_at < $2::date + INTERVAL '1 year'`

    const { rows: salesRows } = await pool.query(
      `SELECT to_char(t.created_at,'YYYY-MM') AS month, COUNT(*)::int AS transactions,
              COALESCE(SUM(t.grand_total),0) AS gross_sales
         FROM transactions t
        WHERE t.admin_id = $1 AND ${range} AND ${VALID_SALE}
        GROUP BY month`, p)
    const { rows: cogsRows } = await pool.query(
      `SELECT to_char(t.created_at,'YYYY-MM') AS month,
              COALESCE(SUM(ti.cost_price * ti.quantity),0) AS cogs
         FROM transaction_items ti
         JOIN transactions t ON t.id = ti.transaction_id
        WHERE t.admin_id = $1 AND ${range} AND ${VALID_SALE}
        GROUP BY month`, p)

    const salesMap = Object.fromEntries(salesRows.map(r => [r.month, r]))
    const cogsMap  = Object.fromEntries(cogsRows.map(r => [r.month, n(r.cogs)]))

    const months = []
    for (let m = 1; m <= 12; m++) {
      const key   = `${year}-${String(m).padStart(2, '0')}`
      const gross = n(salesMap[key]?.gross_sales)
      const cogs  = n(cogsMap[key])
      months.push({
        month: key,
        gross_sales: gross,
        cogs,
        gross_profit: gross - cogs,
        transactions: n(salesMap[key]?.transactions),
        aov: n(salesMap[key]?.transactions) > 0 ? gross / n(salesMap[key].transactions) : 0,
      })
    }

    // Proyeksi: rata-rata 3 bulan terakhir yang ADA penjualannya (>0)
    const active = months.filter(m => m.gross_sales > 0)
    const last3  = active.slice(-3)
    const projection = last3.length
      ? Math.round(last3.reduce((s, m) => s + m.gross_sales, 0) / last3.length)
      : 0

    res.json({
      year,
      months,
      total: {
        gross_sales:  months.reduce((s, m) => s + m.gross_sales, 0),
        cogs:         months.reduce((s, m) => s + m.cogs, 0),
        gross_profit: months.reduce((s, m) => s + m.gross_profit, 0),
        transactions: months.reduce((s, m) => s + m.transactions, 0),
      },
      projection: {
        next_month_estimate: projection,
        method: `Rata-rata ${last3.length} bulan aktif terakhir`,
        based_on: last3.map(m => m.month),
      },
    })
  } catch (err) { next(err) }
})

module.exports = router
