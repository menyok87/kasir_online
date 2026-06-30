const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const sharp   = require('sharp');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Maks dimensi & kualitas hasil kompres
const MAX_DIM  = 1280;  // sisi terpanjang; QR/logo tetap tajam, foto produk cukup
const QUALITY  = 80;    // WebP quality (80 = keseimbangan ukuran vs kualitas)

// Simpan di memori dulu → kompres dengan sharp → tulis ke disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // terima sampai 10 MB (akan dikompres jadi kecil)
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpe?g|png|webp|gif|heic|heif)$/i.test(file.mimetype);
    cb(ok ? null : new Error('Hanya gambar yang diperbolehkan (jpg, png, webp, gif)'), ok);
  },
});

// POST /api/uploads — unggah gambar (otomatis dikompres ke WebP)
router.post('/', (req, res, next) => {
  upload.single('image')(req, res, async err => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Ukuran file maks 10 MB' });
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });

    try {
      const name    = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      const outPath = path.join(UPLOAD_DIR, name);

      const image = sharp(req.file.buffer, { animated: true }).rotate(); // rotate() = auto-orient EXIF
      const meta  = await image.metadata();

      // Hanya perkecil bila lebih besar dari MAX_DIM (tidak memperbesar gambar kecil)
      if ((meta.width || 0) > MAX_DIM || (meta.height || 0) > MAX_DIM) {
        image.resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true });
      }

      await image.webp({ quality: QUALITY, effort: 4 }).toFile(outPath);

      const before = req.file.size;
      const after  = fs.statSync(outPath).size;
      res.json({
        url:    `/uploads/${name}`,
        size:   after,
        saved:  before > 0 ? Math.round((1 - after / before) * 100) : 0, // % penghematan
      });
    } catch (e) {
      next(e);
    }
  });
});

// DELETE /api/uploads — hapus file lama (dipanggil saat ganti/hapus gambar)
router.delete('/', (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.json({ ok: true }); // abaikan jika kosong

  const safe     = path.basename(filename); // cegah path traversal
  const filePath = path.join(UPLOAD_DIR, safe);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ ok: true });
});

module.exports = router;
