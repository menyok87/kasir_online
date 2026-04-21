const express   = require('express');
const router    = express.Router();
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const crypto    = require('crypto');
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

// POST /api/auth/register — daftar akun admin baru
router.post('/register', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { username, password, name, store_name } = req.body;
    if (!username?.trim())   return res.status(400).json({ error: 'Username wajib diisi' });
    if (!name?.trim())       return res.status(400).json({ error: 'Nama lengkap wajib diisi' });
    if (!password)           return res.status(400).json({ error: 'Password wajib diisi' });
    if (password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });

    const uname = username.trim().toLowerCase().replace(/\s+/g, '_');

    // Cek username sudah ada
    const { rows: exist } = await client.query(
      'SELECT id FROM users WHERE username = $1', [uname]
    );
    if (exist.length) return res.status(409).json({ error: 'Username sudah digunakan' });

    await client.query('BEGIN');

    const hash = await bcrypt.hash(password, 10);
    const { rows: userRows } = await client.query(
      `INSERT INTO users (username, password, role, name) VALUES ($1,$2,'admin',$3) RETURNING id, username, role, name`,
      [uname, hash, name.trim()]
    );
    const user = userRows[0];

    // Store settings default
    await client.query(
      `INSERT INTO store_settings (admin_id, store_name, store_tagline, footer_msg)
       VALUES ($1,$2,'Point of Sale','Terima kasih telah berbelanja!')`,
      [user.id, (store_name?.trim() || name.trim() + ' Store')]
    );

    // Default accounts
    const defaultAccounts = [
      ['1-1001','Kas Tunai','kas','Uang tunai di tangan'],
      ['1-1002','Bank','bank','Rekening bank utama'],
      ['1-2001','Piutang Dagang','piutang','Tagihan kepada pelanggan'],
      ['2-1001','Hutang Dagang','hutang','Kewajiban kepada pemasok'],
      ['3-1001','Modal Usaha','modal','Modal awal pemilik usaha'],
      ['4-1001','Pendapatan Penjualan','pendapatan','Penerimaan dari penjualan'],
      ['5-1001','Beban Operasional','beban','Biaya operasional usaha'],
    ];
    for (const [code, accName, type, desc] of defaultAccounts) {
      await client.query(
        `INSERT INTO accounts (admin_id,code,name,type,description) VALUES ($1,$2,$3,$4,$5)`,
        [user.id, code, accName, type, desc]
      ).catch(() => {});
    }

    await client.query('COMMIT');

    const payload = { id: user.id, username: user.username, role: user.role, name: user.name };
    const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.status(201).json({ token, user: payload });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
});

// GET /api/auth/me — cek token & kembalikan data user
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/change-password
router.put('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Password lama dan baru wajib diisi' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password baru minimal 6 karakter' });
    }

    const { rows } = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User tidak ditemukan' });

    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) return res.status(400).json({ error: 'Password lama salah' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, req.user.id]);

    res.json({ message: 'Password berhasil diubah' });
  } catch (err) { next(err); }
});

// POST /api/auth/forgot-password — buat kode reset 6 digit
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { username } = req.body;
    if (!username?.trim()) {
      return res.status(400).json({ error: 'Username wajib diisi' });
    }

    const { rows } = await pool.query(
      'SELECT id FROM users WHERE username = $1 AND is_active = TRUE',
      [username.trim().toLowerCase()]
    );

    // Selalu response 200 meski user tidak ada (mencegah username enumeration)
    if (rows.length === 0) {
      return res.json({ message: 'Jika username terdaftar, kode reset telah dibuat.' });
    }

    // Kode 6 digit numerik, simpan plaintext (sudah time-limited & single-use)
    const code    = String(crypto.randomInt(100000, 999999));
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 menit

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
      [code, expires, rows[0].id]
    );

    // Untuk sistem lokal: kembalikan kode langsung ke client
    res.json({ code, expires_at: expires });
  } catch (err) { next(err); }
});

// POST /api/auth/reset-password — verifikasi kode & set password baru
router.post('/reset-password', async (req, res, next) => {
  try {
    const { username, code, newPassword } = req.body;
    if (!username?.trim() || !code?.trim() || !newPassword) {
      return res.status(400).json({ error: 'Username, kode, dan password baru wajib diisi' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }

    const { rows } = await pool.query(
      `SELECT id, reset_token, reset_expires FROM users
       WHERE username = $1 AND is_active = TRUE`,
      [username.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Username tidak ditemukan' });
    }

    const user = rows[0];

    if (!user.reset_token || !user.reset_expires) {
      return res.status(400).json({ error: 'Belum ada kode reset. Minta kode reset terlebih dahulu.' });
    }
    if (new Date() > new Date(user.reset_expires)) {
      return res.status(400).json({ error: 'Kode reset sudah kadaluarsa. Minta kode baru.' });
    }
    if (user.reset_token !== code.trim()) {
      return res.status(400).json({ error: 'Kode reset salah' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
      [hash, user.id]
    );

    res.json({ message: 'Password berhasil direset. Silakan login dengan password baru.' });
  } catch (err) { next(err); }
});

module.exports = router;
