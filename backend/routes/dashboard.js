const express = require('express');
const router  = express.Router();
const pool    = require('../database/db');
const { authenticate, tenantId } = require('../middleware/authMiddleware');

// GET /api/dashboard/summary — statistik hari ini milik tenant
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const tid = tenantId(req.user);

    const [revenue, orders, totalProducts, lowStock, topProducts] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(grand_total),0)::numeric as total
         FROM transactions WHERE created_at::date = CURRENT_DATE AND admin_id = $1`,
        [tid]
      ),
      pool.query(
        `SELECT COUNT(*)::int as count FROM transactions
         WHERE created_at::date = CURRENT_DATE AND admin_id = $1`,
        [tid]
      ),
      pool.query(
        `SELECT COUNT(*)::int as count FROM products WHERE is_active = TRUE AND admin_id = $1`,
        [tid]
      ),
      pool.query(
        `SELECT COUNT(*)::int as count FROM products WHERE is_active = TRUE AND stock <= 5 AND admin_id = $1`,
        [tid]
      ),
      pool.query(`
        SELECT ti.product_name,
               SUM(ti.quantity)::int    as total_qty,
               SUM(ti.subtotal)::numeric as total_revenue
        FROM transaction_items ti
        JOIN transactions t ON ti.transaction_id = t.id
        WHERE t.created_at::date = CURRENT_DATE AND t.admin_id = $1
        GROUP BY ti.product_name
        ORDER BY total_qty DESC
        LIMIT 5`,
        [tid]
      ),
    ]);

    res.json({
      today_revenue:  Number(revenue.rows[0].total),
      today_orders:   orders.rows[0].count,
      total_products: totalProducts.rows[0].count,
      low_stock_count: lowStock.rows[0].count,
      top_products:   topProducts.rows,
    });
  } catch (err) { next(err); }
});

// GET /api/dashboard/chart — grafik pendapatan harian milik tenant
router.get('/chart', authenticate, async (req, res, next) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 30);
    const tid  = tenantId(req.user);

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
      LEFT JOIN transactions t ON t.created_at::date = d::date AND t.admin_id = $2
      GROUP BY d
      ORDER BY d`,
      [days, tid]
    );

    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
