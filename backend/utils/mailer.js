const nodemailer = require('nodemailer')

function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

function createTransporter() {
  const port   = Number(process.env.SMTP_PORT) || 465
  const secure = port === 465  // port 465 = SSL langsung; port 587 = STARTTLS
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'srv.mnx-email.com',
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  })
}

function maskEmail(email) {
  const [local, domain] = email.split('@')
  const masked = local.length <= 2
    ? local[0] + '*'.repeat(local.length - 1)
    : local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
  return `${masked}@${domain}`
}

// ── Template email verifikasi ─────────────────────────────────────────────────
function verificationEmailHtml(name, verifyUrl, storeName = 'Kasir Online') {
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Verifikasi Email</title>
<style>
  body{margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  .wrap{max-width:560px;margin:40px auto;padding:0 16px 40px}
  .card{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .header{background:linear-gradient(135deg,#2563eb,#4f46e5);padding:40px 40px 36px;text-align:center}
  .logo-box{width:60px;height:60px;background:rgba(255,255,255,.2);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:16px}
  .header h1{margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-.5px}
  .header p{margin:6px 0 0;color:rgba(255,255,255,.75);font-size:14px}
  .body{padding:36px 40px}
  .greeting{font-size:16px;color:#1e293b;font-weight:600;margin:0 0 12px}
  .text{font-size:14px;color:#475569;line-height:1.7;margin:0 0 28px}
  .btn-wrap{text-align:center;margin:0 0 28px}
  .btn{display:inline-block;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:-.2px}
  .divider{border:none;border-top:1px solid #e2e8f0;margin:28px 0}
  .alt-link{font-size:12px;color:#64748b;text-align:center;word-break:break-all}
  .alt-link a{color:#2563eb}
  .warning{background:#fef9c3;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;font-size:12px;color:#92400e;margin-top:20px;line-height:1.6}
  .footer{background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0}
  .footer p{margin:0;font-size:12px;color:#94a3b8}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="header">
      <div class="logo-box">🏪</div>
      <h1>${storeName}</h1>
      <p>Point of Sale</p>
    </div>
    <div class="body">
      <p class="greeting">Halo, ${name}!</p>
      <p class="text">
        Terima kasih telah mendaftar di <strong>${storeName}</strong>.<br>
        Klik tombol di bawah untuk memverifikasi alamat email Anda dan mengaktifkan akun.
      </p>
      <div class="btn-wrap">
        <a href="${verifyUrl}" class="btn">✉️ &nbsp;Verifikasi Email Saya</a>
      </div>
      <hr class="divider">
      <div class="alt-link">
        Tidak bisa klik tombol? Salin dan buka URL ini di browser:<br>
        <a href="${verifyUrl}">${verifyUrl}</a>
      </div>
      <div class="warning">
        ⏰ &nbsp;Link ini berlaku selama <strong>24 jam</strong>. Jika Anda tidak mendaftar di ${storeName}, abaikan email ini.
      </div>
    </div>
    <div class="footer">
      <p>Email ini dikirim otomatis oleh sistem ${storeName}. Jangan balas email ini.</p>
    </div>
  </div>
</div>
</body>
</html>`
}

// ── Kirim email verifikasi ─────────────────────────────────────────────────────
async function sendVerificationEmail({ to, name, token, baseUrl }) {
  if (!isConfigured()) {
    console.log(`[Mailer] SMTP tidak dikonfigurasi. URL verifikasi:\n  ${baseUrl}/verify-email?token=${token}`)
    return { skipped: true }
  }

  const verifyUrl = `${baseUrl}/verify-email?token=${token}`
  const transporter = createTransporter()

  await transporter.sendMail({
    from:    process.env.SMTP_FROM || `"Kasir Online" <${process.env.SMTP_USER}>`,
    to,
    subject: '✉️ Verifikasi Email Anda — Kasir Online',
    html:    verificationEmailHtml(name, verifyUrl),
  })

  return { sent: true }
}

module.exports = { isConfigured, maskEmail, sendVerificationEmail }
