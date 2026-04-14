const express = require('express');
const router = express.Router();
const pool = require('../database/db');

// GET /api/dashboard/summary - Ringkasan hari ini
router.get('/summary', async (req, res, next) => {
  try {
    const [revenue, orders, totalProducts, lowStock, topProducts] = await Promise.all([
      pool.query(
        "SELECT COALESCE(SUM(grand_total),0)::numeric as total FROM transactions WHERE created_at::date = CURRENT_DATE"
      ),
      pool.query(
        "SELECT COUNT(*)::int as count FROM transactions WHERE created_at::date = CURRENT_DATE"
      ),
      pool.query(
        'SELECT COUNT(*)::int as count FROM products WHERE is_active = TRUE'
      ),
      pool.query(
        'SELECT COUNT(*)::int as count FROM products WHERE is_active = TRUE AND stock <= 5'
      ),
      pool.query(`
        SELECT ti.product_name,
               SUM(ti.quantity)::int as total_qty,
               SUM(ti.subtotal)::numeric as total_revenue
        FROM transaction_items ti
        JOIN transactions t ON ti.transaction_id = t.id
        WHERE t.created_at::date = CURRENT_DATE
        GROUP BY ti.product_name
        ORDER BY total_qty DESC
        LIMIT 5
      `),
    ]);

    res.json({
      today_revenue: Number(revenue.rows[0].total),
      today_orders: orders.rows[0].count,
      total_products: totalProducts.rows[0].count,
      low_stock_count: lowStock.rows[0].count,
      top_products: topProducts.rows,
    });
  } catch (err) { next(err); }
});

// GET /api/dashboard/chart - Data grafik pendapatan harian
router.get('/chart', async (req, res, next) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 30);

    const { rows } = await pool.query(`
      SELECT
        d::date as date,
        COALESCE(SUM(t.grand_total), 0)::numeric as revenue,
        COUNT(t.id)::int as orders
      FROM generate_series(
        CURRENT_DATE - ($1 - 1) * INTERVAL '1 day',
        CURRENT_DATE,
        INTERVAL '1 day'
      ) AS d
      LEFT JOIN transactions t ON t.created_at::date = d::date
      GROUP BY d
      ORDER BY d
    `, [days]);

    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
