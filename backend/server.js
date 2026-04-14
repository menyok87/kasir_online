require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors    = require('cors');
const bodyParser = require('body-parser');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3002;
const isProd = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(bodyParser.json());

const { authenticate, requireAdmin } = require('./middleware/authMiddleware');

// ── Uploaded images (harus sebelum static frontend) ─────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '30d',
  etag: true,
}));

// ── Public routes ────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));
app.use('/api/auth', require('./routes/auth'));

// ── Protected API Routes (semua butuh login) ─────────────────
app.use('/api/categories',   authenticate, require('./routes/categories'));
app.use('/api/products',     authenticate, require('./routes/products'));
app.use('/api/transactions', authenticate, require('./routes/transactions'));
app.use('/api/dashboard',    authenticate, requireAdmin, require('./routes/dashboard'));
app.use('/api/uploads',      authenticate, require('./routes/uploads'));
app.use('/api/users',        authenticate, require('./routes/users'));

// ── Static Frontend (production) ────────────────────────────
// Nginx memproksi semua request ke Express, jadi Express
// perlu melayani file hasil build Vite (frontend/dist).
if (isProd) {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath, {
    maxAge: '1y',            // cache asset statis 1 tahun
    etag: true,
  }));

  // SPA fallback — semua route non-API dikembalikan ke index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ── Error Handler ────────────────────────────────────────────
app.use(require('./middleware/errorHandler'));

app.listen(PORT, () => {
  console.log(`Kasir Online berjalan di http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
