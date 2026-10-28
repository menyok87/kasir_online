const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const pool    = require('../database/db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const adminOrSuper = requireRole('superadmin', 'admin');

// GET /api/users
// superadmin: semua user; admin: hanya kasir miliknya
router.get('/', authenticate, adminOrSuper, async (req, res, next) => {
  try {
    let rows;
    if (req.user.role === 'superadmin') {
      const result = await pool.query(
        `SELECT u.id, u.username, u.name, u.role, u.is_active, u.created_at, u.created_by,
                c.name AS created_by_name
         FROM users u
         LEFT JOIN users c ON u.created_by = c.id
         ORDER BY u.role, u.created_at`
      );
      rows = result.rows;
    } else {
      const result = await pool.query(
        `SELECT id, username, name, role, is_active, created_at, created_by
         FROM users WHERE created_by = $1 AND role = 'kasir' ORDER BY created_at`,
        [req.user.id]
      );
      rows = result.rows;
    }
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/users — buat user baru
// superadmin: semua role; admin: hanya kasir
router.post('/', authenticate, adminOrSuper, async (req, res, next) => {
  try {
    const { username, name, password, role } = req.body;
    if (!username?.trim()) return res.status(400).json({ error: 'Username wajib diisi' });
    if (!name?.trim())     return res.status(400).json({ error: 'Nama wajib diisi' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });

    const allowedRoles = req.user.role === 'superadmin'
      ? ['superadmin', 'admin', 'supervisor', 'kasir']
      : ['kasir'];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Anda tidak bisa membuat user dengan role tersebut' });
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (username, name, password, role, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, name, role, is_active, created_at, created_by`,
      [username.trim().toLowerCase(), name.trim(), hash, role, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username sudah digunakan' });
    next(err);
  }
});

// PUT /api/users/:id — update user
router.put('/:id', authenticate, adminOrSuper, async (req, res, next) => {
  try {
    const { name, role, password } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nama wajib diisi' });

    const allowedRoles = req.user.role === 'superadmin'
      ? ['superadmin', 'admin', 'supervisor', 'kasir']
      : ['kasir'];
    if (!allowedRoles.includes(role)) return res.status(400).json({ error: 'Role tidak valid' });

    // Admin hanya bisa edit kasir miliknya
    if (req.user.role === 'admin') {
      const { rows: check } = await pool.query(
        `SELECT id FROM users WHERE id = $1 AND created_by = $2 AND role = 'kasir'`,
        [req.params.id, req.user.id]
      );
      if (!check.length) return res.status(403).json({ error: 'Akses ditolak' });
    }

    // Superadmin tidak bisa ganti role diri sendiri
    if (Number(req.params.id) === req.user.id && role !== req.user.role) {
      return res.status(400).json({ error: 'Tidak bisa mengubah role akun sendiri' });
    }

    let query, params;
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });
      const hash = await bcrypt.hash(password, 10);
      query  = `UPDATE users SET name=$1, role=$2, password=$3 WHERE id=$4
                RETURNING id, username, name, role, is_active, created_at, created_by`;
      params = [name.trim(), role, hash, req.params.id];
    } else {
      query  = `UPDATE users SET name=$1, role=$2 WHERE id=$3
                RETURNING id, username, name, role, is_active, created_at, created_by`;
      params = [name.trim(), role, req.params.id];
    }

    const { rows } = await pool.query(query, params);
    if (!rows.length) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/users/:id/toggle — aktifkan / nonaktifkan
router.patch('/:id/toggle', authenticate, adminOrSuper, async (req, res, next) => {
  try {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Tidak bisa menonaktifkan akun sendiri' });
    }

    // Admin hanya bisa toggle kasir miliknya
    if (req.user.role === 'admin') {
      const { rows: check } = await pool.query(
        `SELECT id FROM users WHERE id = $1 AND created_by = $2 AND role = 'kasir'`,
        [req.params.id, req.user.id]
      );
      if (!check.length) return res.status(403).json({ error: 'Akses ditolak' });
    }

    const { rows } = await pool.query(
      `UPDATE users SET is_active = NOT is_active WHERE id=$1
       RETURNING id, username, name, role, is_active`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
