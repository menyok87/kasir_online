const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const pool    = require('../database/db');
const { requireAdmin } = require('../middleware/authMiddleware');

// Semua endpoint users → admin only
router.use(requireAdmin);

// GET /api/users — daftar semua user
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, name, role, is_active, created_at FROM users ORDER BY created_at'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/users — buat user baru
router.post('/', async (req, res, next) => {
  try {
    const { username, name, password, role } = req.body;
    if (!username?.trim()) return res.status(400).json({ error: 'Username wajib diisi' });
    if (!name?.trim())     return res.status(400).json({ error: 'Nama wajib diisi' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });
    if (!['admin', 'kasir'].includes(role)) return res.status(400).json({ error: 'Role tidak valid' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (username, name, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, name, role, is_active, created_at`,
      [username.trim().toLowerCase(), name.trim(), hash, role]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username sudah digunakan' });
    next(err);
  }
});

// PUT /api/users/:id — update user (password opsional)
router.put('/:id', async (req, res, next) => {
  try {
    const { name, role, password } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nama wajib diisi' });
    if (!['admin', 'kasir'].includes(role)) return res.status(400).json({ error: 'Role tidak valid' });

    // Cegah admin cabut role diri sendiri
    if (Number(req.params.id) === req.user.id && role !== 'admin') {
      return res.status(400).json({ error: 'Tidak bisa mengubah role akun sendiri' });
    }

    let query, params;
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });
      const hash = await bcrypt.hash(password, 10);
      query  = 'UPDATE users SET name=$1, role=$2, password=$3 WHERE id=$4 RETURNING id, username, name, role, is_active, created_at';
      params = [name.trim(), role, hash, req.params.id];
    } else {
      query  = 'UPDATE users SET name=$1, role=$2 WHERE id=$3 RETURNING id, username, name, role, is_active, created_at';
      params = [name.trim(), role, req.params.id];
    }

    const { rows } = await pool.query(query, params);
    if (rows.length === 0) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/users/:id/toggle — aktifkan / nonaktifkan user
router.patch('/:id/toggle', async (req, res, next) => {
  try {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Tidak bisa menonaktifkan akun sendiri' });
    }
    const { rows } = await pool.query(
      'UPDATE users SET is_active = NOT is_active WHERE id=$1 RETURNING id, username, name, role, is_active',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
