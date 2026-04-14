const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'kasir-jwt-secret-ganti-di-production';

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

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Akses ditolak. Hanya admin yang diizinkan.' });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
