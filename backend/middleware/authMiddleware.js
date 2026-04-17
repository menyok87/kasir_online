const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'kasir-jwt-secret-ganti-di-production';

// Hierarki role (semakin tinggi = semakin banyak akses)
const ROLES = ['kasir', 'supervisor', 'admin', 'superadmin'];

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses ditolak. Login terlebih dahulu.' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Sesi habis. Silakan login kembali.' });
  }
}

// Factory: hanya role yang disebutkan yang boleh lewat
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Akses ditolak. Anda tidak memiliki izin.' });
    }
    next();
  };
}

// Shortcut: superadmin + admin
const requireAdmin = requireRole('superadmin', 'admin');

// Shortcut: superadmin saja
const requireSuperAdmin = requireRole('superadmin');

// Shortcut: superadmin + admin + supervisor
const requireManager = requireRole('superadmin', 'admin', 'supervisor');

module.exports = { authenticate, requireAdmin, requireSuperAdmin, requireManager, requireRole };
