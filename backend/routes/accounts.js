const express = require('express');
const router  = express.Router();
const pool    = require('../database/db');
const { tenantId } = require('../middleware/authMiddleware');

const VALID_TYPES = ['kas', 'bank', 'piutang', 'hutang', 'modal', 'pendapatan', 'beban'];

// GET /api/accounts
router.get('/', async (req, res, next) => {
  try {
    const tid = tenantId(req.user);
    const { rows } = await pool.query(
      `SELECT * FROM accounts WHERE admin_id = $1 AND is_active = TRUE ORDER BY code`,
      [tid]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/accounts
router.post('/', async (req, res, next) => {
  try {
    const { code, name, type, balance = 0, description = '' } = req.body;
    if (!code?.trim()) return res.status(400).json({ error: 'Kode akun wajib diisi' });
    if (!name?.trim()) return res.status(400).json({ error: 'Nama akun wajib diisi' });
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Tipe akun tidak valid' });

    const tid = tenantId(req.user);
    const { rows } = await pool.query(
      `INSERT INTO accounts (admin_id, code, name, type, balance, description)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tid, code.trim().toUpperCase(), name.trim(), type, Number(balance) || 0, description]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Kode akun sudah digunakan' });
    next(err);
  }
});

// PUT /api/accounts/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { code, name, type, balance, description } = req.body;
    if (!code?.trim()) return res.status(400).json({ error: 'Kode akun wajib diisi' });
    if (!name?.trim()) return res.status(400).json({ error: 'Nama akun wajib diisi' });
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Tipe akun tidak valid' });

    const tid = tenantId(req.user);
    const { rows } = await pool.query(
      `UPDATE accounts SET code=$1, name=$2, type=$3, balance=$4, description=$5
       WHERE id=$6 AND admin_id=$7 AND is_active=TRUE RETURNING *`,
      [code.trim().toUpperCase(), name.trim(), type, Number(balance) || 0, description || '', req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Akun tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Kode akun sudah digunakan' });
    next(err);
  }
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const tid = tenantId(req.user);
    const { rows } = await pool.query(
      `UPDATE accounts SET is_active=FALSE WHERE id=$1 AND admin_id=$2 AND is_active=TRUE RETURNING id`,
      [req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Akun tidak ditemukan' });
    res.json({ message: 'Akun berhasil dihapus' });
  } catch (err) { next(err); }
});

module.exports = router;
