const express   = require('express')
const router    = express.Router()
const bcrypt    = require('bcryptjs')
const jwt       = require('jsonwebtoken')
const crypto    = require('crypto')
const pool      = require('../database/db')
const { authenticate }                     = require('../middleware/authMiddleware')
const { isConfigured, maskEmail, sendVerificationEmail } = require('../utils/mailer')

const JWT_SECRET  = process.env.JWT_SECRET || 'kasir-jwt-secret-ganti-di-production'
const JWT_EXPIRES = '8h'

function getBaseUrl(req) {
  return process.env.APP_URL ||
    `${req.protocol}://${req.get('host')}`
}

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' })
    }

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = TRUE',
      [username.trim().toLowerCase()]
    )
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Username atau password salah' })
    }

    const user  = rows[0]
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Username atau password salah' })
    }

    // Blokir login jika email belum diverifikasi (hanya jika email ada & SMTP dikonfigurasi)
    if (user.email && !user.email_verified) {
      return res.status(403).json({
        error:      'Email belum diverifikasi. Cek inbox Anda.',
        unverified: true,
        email:      maskEmail(user.email),
      })
    }

    const payload = { id: user.id, username: user.username, role: user.role, name: user.name }
    const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES })
    res.json({ token, user: payload })
  } catch (err) { next(err) }
})

// POST /api/auth/register — daftar akun admin baru
router.post('/register', async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { username, password, name, store_name, email } = req.body
    if (!username?.trim())   return res.status(400).json({ error: 'Username wajib diisi' })
    if (!name?.trim())       return res.status(400).json({ error: 'Nama lengkap wajib diisi' })
    if (!password)           return res.status(400).json({ error: 'Password wajib diisi' })
    if (password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' })
    if (!email?.trim())      return res.status(400).json({ error: 'Email wajib diisi' })

    // Validasi format email sederhana
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Format email tidak valid' })
    }

    const uname      = username.trim().toLowerCase().replace(/\s+/g, '_')
    const emailClean = email.trim().toLowerCase()

    // Cek duplikat
    const { rows: exist } = await client.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [uname, emailClean]
    )
    if (exist.length) {
      const dup = exist.find(r => r.username === uname) ? 'Username' : 'Email'
      return res.status(409).json({ error: `${dup} sudah digunakan` })
    }

    await client.query('BEGIN')

    // Jika SMTP dikonfigurasi → buat token verifikasi, email_verified = false
    // Jika tidak → langsung verified
    const smtpReady      = isConfigured()
    const verifyToken    = smtpReady ? crypto.randomBytes(32).toString('hex') : null
    const verifyExpires  = smtpReady ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null
    const emailVerified  = !smtpReady

    const hash = await bcrypt.hash(password, 10)
    const { rows: userRows } = await client.query(
      `INSERT INTO users
         (username, password, role, name, email, email_verified, verification_token, verification_expires)
       VALUES ($1,$2,'admin',$3,$4,$5,$6,$7)
       RETURNING id, username, role, name, email, email_verified`,
      [uname, hash, name.trim(), emailClean, emailVerified, verifyToken, verifyExpires]
    )
    const user = userRows[0]

    // Store settings default
    await client.query(
      `INSERT INTO store_settings (admin_id, store_name, store_tagline, store_email, footer_msg)
       VALUES ($1,$2,'Point of Sale',$3,'Terima kasih telah berbelanja!')`,
      [user.id, store_name?.trim() || name.trim() + ' Store', emailClean]
    )

    // Default chart of accounts
    const defaultAccounts = [
      ['1-1001','Kas Tunai','kas','Uang tunai di tangan'],
      ['1-1002','Bank','bank','Rekening bank utama'],
      ['1-2001','Piutang Dagang','piutang','Tagihan kepada pelanggan'],
      ['2-1001','Hutang Dagang','hutang','Kewajiban kepada pemasok'],
      ['3-1001','Modal Usaha','modal','Modal awal pemilik usaha'],
      ['4-1001','Pendapatan Penjualan','pendapatan','Penerimaan dari penjualan'],
      ['5-1001','Beban Operasional','beban','Biaya operasional usaha'],
    ]
    for (const [code, accName, type, desc] of defaultAccounts) {
      await client.query(
        `INSERT INTO accounts (admin_id,code,name,type,description) VALUES ($1,$2,$3,$4,$5)`,
        [user.id, code, accName, type, desc]
      ).catch(() => {})
    }

    await client.query('COMMIT')

    // Kirim email verifikasi (async, tidak blokir response)
    if (smtpReady && verifyToken) {
      sendVerificationEmail({
        to:      emailClean,
        name:    name.trim(),
        token:   verifyToken,
        baseUrl: getBaseUrl(req),
      }).catch(err => console.error('[Mailer] Gagal kirim email:', err.message))
    }

    const payload = { id: user.id, username: user.username, role: user.role, name: user.name }

    if (emailVerified) {
      // SMTP tidak dikonfigurasi → langsung login
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES })
      return res.status(201).json({ token, user: payload })
    }

    // SMTP dikonfigurasi → minta verifikasi dulu
    res.status(201).json({
      needsVerification: true,
      email: maskEmail(emailClean),
      message: `Link verifikasi dikirim ke ${maskEmail(emailClean)}. Cek inbox Anda.`,
    })
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally { client.release() }
})

// GET /api/auth/verify-email?token=xxx
router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query
    if (!token) return res.status(400).json({ error: 'Token tidak valid' })

    const { rows } = await pool.query(
      `SELECT id, name, email_verified, verification_expires
       FROM users WHERE verification_token = $1`,
      [token]
    )

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Token tidak valid atau sudah digunakan' })
    }

    const user = rows[0]

    if (user.email_verified) {
      return res.json({ alreadyVerified: true, message: 'Email sudah terverifikasi sebelumnya.' })
    }

    if (new Date() > new Date(user.verification_expires)) {
      return res.status(400).json({ error: 'Link verifikasi sudah kadaluarsa. Minta link baru.', expired: true })
    }

    await pool.query(
      `UPDATE users
       SET email_verified = TRUE, verification_token = NULL, verification_expires = NULL
       WHERE id = $1`,
      [user.id]
    )

    res.json({ success: true, message: 'Email berhasil diverifikasi! Silakan login.' })
  } catch (err) { next(err) }
})

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email?.trim()) return res.status(400).json({ error: 'Email wajib diisi' })

    const { rows } = await pool.query(
      'SELECT id, name, email, email_verified FROM users WHERE email = $1 AND is_active = TRUE',
      [email.trim().toLowerCase()]
    )

    // Selalu 200 untuk mencegah email enumeration
    if (rows.length === 0 || rows[0].email_verified) {
      return res.json({ message: 'Jika email terdaftar dan belum diverifikasi, link baru telah dikirim.' })
    }

    const user         = rows[0]
    const newToken     = crypto.randomBytes(32).toString('hex')
    const newExpires   = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await pool.query(
      'UPDATE users SET verification_token = $1, verification_expires = $2 WHERE id = $3',
      [newToken, newExpires, user.id]
    )

    sendVerificationEmail({
      to:      user.email,
      name:    user.name,
      token:   newToken,
      baseUrl: getBaseUrl(req),
    }).catch(err => console.error('[Mailer] Gagal kirim ulang email:', err.message))

    res.json({ message: 'Link verifikasi baru telah dikirim ke email Anda.' })
  } catch (err) { next(err) }
})

// GET /api/auth/me — cek token & kembalikan data user
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user })
})

// PUT /api/auth/change-password
router.put('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Password lama dan baru wajib diisi' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password baru minimal 6 karakter' })
    }

    const { rows } = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id])
    if (!rows.length) return res.status(404).json({ error: 'User tidak ditemukan' })

    const valid = await bcrypt.compare(currentPassword, rows[0].password)
    if (!valid) return res.status(400).json({ error: 'Password lama salah' })

    const hash = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, req.user.id])

    res.json({ message: 'Password berhasil diubah' })
  } catch (err) { next(err) }
})

// POST /api/auth/forgot-password — buat kode reset 6 digit
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { username } = req.body
    if (!username?.trim()) {
      return res.status(400).json({ error: 'Username wajib diisi' })
    }

    const { rows } = await pool.query(
      'SELECT id FROM users WHERE username = $1 AND is_active = TRUE',
      [username.trim().toLowerCase()]
    )

    if (rows.length === 0) {
      return res.json({ message: 'Jika username terdaftar, kode reset telah dibuat.' })
    }

    const code    = String(crypto.randomInt(100000, 999999))
    const expires = new Date(Date.now() + 30 * 60 * 1000)

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
      [code, expires, rows[0].id]
    )

    res.json({ code, expires_at: expires })
  } catch (err) { next(err) }
})

// POST /api/auth/reset-password — verifikasi kode & set password baru
router.post('/reset-password', async (req, res, next) => {
  try {
    const { username, code, newPassword } = req.body
    if (!username?.trim() || !code?.trim() || !newPassword) {
      return res.status(400).json({ error: 'Username, kode, dan password baru wajib diisi' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' })
    }

    const { rows } = await pool.query(
      'SELECT id, reset_token, reset_expires FROM users WHERE username = $1 AND is_active = TRUE',
      [username.trim().toLowerCase()]
    )

    if (rows.length === 0) return res.status(400).json({ error: 'Username tidak ditemukan' })

    const user = rows[0]
    if (!user.reset_token || !user.reset_expires) {
      return res.status(400).json({ error: 'Belum ada kode reset. Minta kode reset terlebih dahulu.' })
    }
    if (new Date() > new Date(user.reset_expires)) {
      return res.status(400).json({ error: 'Kode reset sudah kadaluarsa. Minta kode baru.' })
    }
    if (user.reset_token !== code.trim()) {
      return res.status(400).json({ error: 'Kode reset salah' })
    }

    const hash = await bcrypt.hash(newPassword, 10)
    await pool.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
      [hash, user.id]
    )

    res.json({ message: 'Password berhasil direset. Silakan login dengan password baru.' })
  } catch (err) { next(err) }
})

module.exports = router
