const express = require('express');
const router  = require('express').Router();
const pool    = require('../database/db');
const { authenticate, requireAdmin, tenantId } = require('../middleware/authMiddleware');

const DEFAULT_SETTINGS = {
  store_name: 'Kasir Online', store_tagline: 'Point of Sale',
  store_address: '', store_phone: '', store_email: '', store_website: '',
  footer_msg: 'Terima kasih telah berbelanja!', show_footer_note: true,
  store_logo: '', qris_image: '', bank_name: '', bank_account_number: '', bank_account_name: '', bank_branch: '',
  midtrans_server_key: '', midtrans_client_key: '', midtrans_is_production: false,
  qris_enabled: true,
  doku_client_id: '', doku_secret_key: '', doku_is_production: false, doku_enabled: false,
  whacenter_device_id: '', whacenter_enabled: false,
  dana_partner_id: '', dana_client_id: '', dana_client_secret: '', dana_merchant_id: '', dana_channel_id: '',
  dana_private_key: '', dana_public_key: '', dana_is_production: false, dana_enabled: false,
  dana_mcc: '', dana_external_store_id: '', dana_sub_merchant_id: '', dana_sim_notify_error: false,
  dana_api_url: '',
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
      store_logo, qris_image, bank_name, bank_account_number, bank_account_name, bank_branch,
      midtrans_server_key, midtrans_client_key, midtrans_is_production, qris_enabled,
      doku_client_id, doku_secret_key, doku_is_production, doku_enabled,
      whacenter_device_id, whacenter_enabled,
      dana_partner_id, dana_client_id, dana_client_secret, dana_merchant_id, dana_channel_id,
      dana_private_key, dana_public_key, dana_is_production, dana_enabled,
      dana_mcc, dana_external_store_id, dana_sub_merchant_id, dana_sim_notify_error,
      dana_api_url,
    } = req.body;

    if (!store_name?.trim()) return res.status(400).json({ error: 'Nama toko wajib diisi' });

    const tid = tenantId(req.user);
    const { rows: existing } = await pool.query(
      'SELECT id FROM store_settings WHERE admin_id = $1',
      [tid]
    );

    // Nilai bersama (urutan kolom sama untuk UPDATE & INSERT)
    const vals = [
      store_name.trim(), store_tagline?.trim() || '', store_address?.trim() || '',
      store_phone?.trim() || '', store_email?.trim() || '', store_website?.trim() || '',
      footer_msg?.trim() || '', show_footer_note !== false,
      store_logo?.trim() || '', qris_image?.trim() || '', bank_name?.trim() || '',
      bank_account_number?.trim() || '', bank_account_name?.trim() || '',
      bank_branch?.trim() || '',
      midtrans_server_key?.trim() || '', midtrans_client_key?.trim() || '',
      midtrans_is_production === true,
      qris_enabled !== false,
      doku_client_id?.trim() || '', doku_secret_key?.trim() || '',
      doku_is_production === true, doku_enabled === true,
      whacenter_device_id?.trim() || '', whacenter_enabled === true,
      dana_partner_id?.trim() || '', dana_client_id?.trim() || '', dana_client_secret?.trim() || '',
      dana_merchant_id?.trim() || '', dana_channel_id?.trim() || '',
      dana_private_key?.trim() || '', dana_public_key?.trim() || '',
      dana_is_production === true, dana_enabled === true,
      dana_mcc?.trim() || '', dana_external_store_id?.trim() || '', dana_sub_merchant_id?.trim() || '',
      dana_sim_notify_error === true,
      dana_api_url?.trim() || '',
    ];

    let rows;
    if (existing.length > 0) {
      const result = await pool.query(`
        UPDATE store_settings SET
          store_name=$1, store_tagline=$2, store_address=$3, store_phone=$4,
          store_email=$5, store_website=$6, footer_msg=$7, show_footer_note=$8,
          store_logo=$9, qris_image=$10, bank_name=$11, bank_account_number=$12,
          bank_account_name=$13, bank_branch=$14,
          midtrans_server_key=$15, midtrans_client_key=$16, midtrans_is_production=$17,
          qris_enabled=$18,
          doku_client_id=$19, doku_secret_key=$20, doku_is_production=$21, doku_enabled=$22,
          whacenter_device_id=$23, whacenter_enabled=$24,
          dana_partner_id=$25, dana_client_id=$26, dana_client_secret=$27, dana_merchant_id=$28,
          dana_channel_id=$29, dana_private_key=$30, dana_public_key=$31,
          dana_is_production=$32, dana_enabled=$33,
          dana_mcc=$34, dana_external_store_id=$35, dana_sub_merchant_id=$36,
          dana_sim_notify_error=$37, dana_api_url=$38,
          updated_at=NOW()
        WHERE admin_id=$39 RETURNING *`,
        [...vals, tid]
      );
      rows = result.rows;
    } else {
      const result = await pool.query(`
        INSERT INTO store_settings
          (store_name, store_tagline, store_address, store_phone, store_email,
           store_website, footer_msg, show_footer_note, store_logo, qris_image, bank_name,
           bank_account_number, bank_account_name, bank_branch,
           midtrans_server_key, midtrans_client_key, midtrans_is_production, qris_enabled,
           doku_client_id, doku_secret_key, doku_is_production, doku_enabled,
           whacenter_device_id, whacenter_enabled,
           dana_partner_id, dana_client_id, dana_client_secret, dana_merchant_id, dana_channel_id,
           dana_private_key, dana_public_key, dana_is_production, dana_enabled,
           dana_mcc, dana_external_store_id, dana_sub_merchant_id, dana_sim_notify_error, dana_api_url, admin_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39) RETURNING *`,
        [...vals, tid]
      );
      rows = result.rows;
    }

    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
