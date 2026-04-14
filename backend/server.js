const express = require('express');
const cors    = require('cors');
const bodyParser = require('body-parser');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3002;
const isProd = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(bodyParser.json());

// ── API Routes ───────────────────────────────────────────────
app.use('/api/categories',   require('./routes/categories'));
app.use('/api/products',     require('./routes/products'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/dashboard',    require('./routes/dashboard'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

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
