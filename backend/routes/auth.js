const express   = require('express');
const router    = express.Router();
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const pool      = require('../database/db');
const { authenticate } = require('../middleware/authMiddleware');

const JWT_SECRET  = process.env.JWT_SECRET || 'kasir-jwt-secret-ganti-di-production';
const JWT_EXPIRES = '8h';

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = TRUE',
      [username.trim().toLowerCase()]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const user  = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const payload = { id: user.id, username: user.username, role: user.role, name: user.name };
    const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({ token, user: payload });
  } catch (err) { next(err); }
});

// GET /api/auth/me — cek token & kembalikan data user
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
