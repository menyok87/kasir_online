const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/dashboard/summary - Ringkasan hari ini
router.get('/summary', (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const revenue = db.prepare(
      "SELECT COALESCE(SUM(grand_total),0) as total FROM transactions WHERE date(created_at)=?"
    ).get(today);

    const orders = db.prepare(
      "SELECT COUNT(*) as count FROM transactions WHERE date(created_at)=?"
    ).get(today);

    const totalProducts = db.prepare(
      'SELECT COUNT(*) as count FROM products WHERE is_active=1'
    ).get();

    const lowStock = db.prepare(
      'SELECT COUNT(*) as count FROM products WHERE is_active=1 AND stock <= 5'
    ).get();

    const topProducts = db.prepare(`
      SELECT ti.product_name, SUM(ti.quantity) as total_qty, SUM(ti.subtotal) as total_revenue
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE date(t.created_at) = ?
      GROUP BY ti.product_name
      ORDER BY total_qty DESC
      LIMIT 5
    `).all(today);

    res.json({
      today_revenue: revenue.total,
      today_orders: orders.count,
      total_products: totalProducts.count,
      low_stock_count: lowStock.count,
      top_products: topProducts
    });
  } catch (err) { next(err); }
});

// GET /api/dashboard/chart - Data grafik pendapatan harian
router.get('/chart', (req, res, next) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 30);

    const rows = db.prepare(`
      WITH RECURSIVE dates(d) AS (
        SELECT date('now','localtime','-' || (? - 1) || ' days')
        UNION ALL
        SELECT date(d, '+1 day') FROM dates WHERE d < date('now','localtime')
      )
      SELECT
        d as date,
        COALESCE(SUM(t.grand_total), 0) as revenue,
        COUNT(t.id) as orders
      FROM dates
      LEFT JOIN transactions t ON date(t.created_at) = d
      GROUP BY d
      ORDER BY d
    `).all(days);

    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
