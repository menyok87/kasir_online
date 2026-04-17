const jwt  = require('jsonwebtoken');
const pool = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'kasir-jwt-secret-ganti-di-production';

// Fetch created_by from DB so tenant isolation always uses fresh data
async function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses ditolak. Login terlebih dahulu.' });
  }
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    const { rows } = await pool.query(
      'SELECT created_by FROM users WHERE id = $1 AND is_active = TRUE',
      [decoded.id]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Akun tidak aktif atau tidak ditemukan' });
    }
    req.user = { ...decoded, created_by: rows[0].created_by };
    next();
  } catch {
    res.status(401).json({ error: 'Sesi habis. Silakan login kembali.' });
  }
}

// Effective admin_id for data isolation (tenant):
// admin/superadmin → their own id; kasir/supervisor → the admin who created them
function tenantId(user) {
  if (user.role === 'admin' || user.role === 'superadmin') return user.id;
  return user.created_by;
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Akses ditolak. Anda tidak memiliki izin.' });
    }
    next();
  };
}

const requireAdmin      = requireRole('superadmin', 'admin');
const requireSuperAdmin = requireRole('superadmin');
const requireManager    = requireRole('superadmin', 'admin', 'supervisor');

module.exports = { authenticate, requireAdmin, requireSuperAdmin, requireManager, requireRole, tenantId };
