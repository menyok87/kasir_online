const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // maks 3 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya gambar yang diperbolehkan (jpg, png, webp, gif)'));
    }
  },
});

// POST /api/uploads — unggah gambar baru
router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// DELETE /api/uploads — hapus file lama (opsional, dipanggil saat ganti/hapus gambar)
router.delete('/', (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.json({ ok: true }); // abaikan jika kosong

  // Cegah path traversal
  const safe     = path.basename(filename);
  const filePath = path.join(UPLOAD_DIR, safe);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ ok: true });
});

module.exports = router;
