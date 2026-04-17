const express = require('express');
const router  = require('express').Router();
const pool    = require('../database/db');
const { authenticate, requireAdmin, tenantId } = require('../middleware/authMiddleware');

const DEFAULT_SETTINGS = {
  store_name: 'Kasir Online', store_tagline: 'Point of Sale',
  store_address: '', store_phone: '', store_email: '', store_website: '',
  footer_msg: 'Terima kasih telah berbelanja!', show_footer_note: true,
  qris_image: '', bank_name: '', bank_account_number: '', bank_account_name: '', bank_branch: '',
};

// GET /api/settings — pengaturan toko milik tenant
router.get('/', authenticate, async (req, res, next) => {
  try {
    const tid = tenantId(req.user);
    const { rows } = await pool.query('SELECT * FROM store_settings WHERE admin_id = $1', [tid]);
    // Return defaults jika belum ada row — row dibuat saat PUT pertama kali
    res.json(rows.length ? rows[0] : DEFAULT_SETTINGS);
  } catch (err) { next(err); }
});

// PUT /api/settings — simpan pengaturan toko (admin only)
router.put('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      store_name, store_tagline, store_address,
      store_phone, store_email, store_website,
      footer_msg, show_footer_note,
      qris_image, bank_name, bank_account_number, bank_account_name, bank_branch,
    } = req.body;

    if (!store_name?.trim()) return res.status(400).json({ error: 'Nama toko wajib diisi' });

    const tid = tenantId(req.user);
    const { rows: existing } = await pool.query(
      'SELECT id FROM store_settings WHERE admin_id = $1',
      [tid]
    );

    let rows;
    if (existing.length > 0) {
      const result = await pool.query(`
        UPDATE store_settings SET
          store_name=$1, store_tagline=$2, store_address=$3, store_phone=$4,
          store_email=$5, store_website=$6, footer_msg=$7, show_footer_note=$8,
          qris_image=$9, bank_name=$10, bank_account_number=$11,
          bank_account_name=$12, bank_branch=$13, updated_at=NOW()
        WHERE admin_id=$14 RETURNING *`,
        [
          store_name.trim(), store_tagline?.trim() || '', store_address?.trim() || '',
          store_phone?.trim() || '', store_email?.trim() || '', store_website?.trim() || '',
          footer_msg?.trim() || '', show_footer_note !== false,
          qris_image?.trim() || '', bank_name?.trim() || '',
          bank_account_number?.trim() || '', bank_account_name?.trim() || '',
          bank_branch?.trim() || '', tid,
        ]
      );
      rows = result.rows;
    } else {
      const result = await pool.query(`
        INSERT INTO store_settings
          (admin_id, store_name, store_tagline, store_address, store_phone, store_email,
           store_website, footer_msg, show_footer_note, qris_image, bank_name,
           bank_account_number, bank_account_name, bank_branch)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
        [
          tid, store_name.trim(), store_tagline?.trim() || '', store_address?.trim() || '',
          store_phone?.trim() || '', store_email?.trim() || '', store_website?.trim() || '',
          footer_msg?.trim() || '', show_footer_note !== false,
          qris_image?.trim() || '', bank_name?.trim() || '',
          bank_account_number?.trim() || '', bank_account_name?.trim() || '',
          bank_branch?.trim() || '',
        ]
      );
      rows = result.rows;
    }

    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
