/**
 * Kompres ulang semua gambar lama di backend/uploads (sekali jalan).
 * Aman: nama file dipertahankan (link di DB tetap valid), dan file hanya
 * diganti bila hasilnya LEBIH KECIL. Tulis ke file sementara dulu, baru ganti.
 *
 * Jalankan: node scripts/compress-uploads.js
 */
const path  = require('path');
const fs    = require('fs');
const sharp = require('sharp');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
const MAX_DIM = 1280;
const QUALITY = 80;

function fmt(b) { return (b / 1024).toFixed(0) + ' KB'; }

async function compressOne(file) {
  const ext     = path.extname(file).toLowerCase();
  const full    = path.join(UPLOAD_DIR, file);
  if (!/\.(jpe?g|png|webp)$/.test(ext)) return null; // lewati gif/animasi & non-gambar
  const before  = fs.statSync(full).size;

  const img  = sharp(full).rotate();
  const meta = await img.metadata();
  if ((meta.width || 0) > MAX_DIM || (meta.height || 0) > MAX_DIM) {
    img.resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true });
  }

  if (ext === '.png')       img.png({ quality: QUALITY, compressionLevel: 9, palette: true });
  else if (ext === '.webp') img.webp({ quality: QUALITY });
  else                      img.jpeg({ quality: QUALITY, mozjpeg: true });

  const buf = await img.toBuffer();
  if (buf.length >= before) return { file, before, after: before, skipped: true }; // tidak membantu

  const tmp = full + '.tmp';
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, full);
  return { file, before, after: buf.length, skipped: false };
}

async function main() {
  if (!fs.existsSync(UPLOAD_DIR)) { console.log('Folder uploads tidak ada.'); return; }
  const files = fs.readdirSync(UPLOAD_DIR).filter(f => !f.startsWith('.'));
  let totalBefore = 0, totalAfter = 0, changed = 0;

  for (const f of files) {
    try {
      const r = await compressOne(f);
      if (!r) continue;
      totalBefore += r.before; totalAfter += r.after;
      if (!r.skipped) {
        changed++;
        console.log(`✓ ${f}: ${fmt(r.before)} → ${fmt(r.after)} (-${Math.round((1 - r.after / r.before) * 100)}%)`);
      }
    } catch (e) {
      console.warn(`✗ ${f}: ${e.message}`);
    }
  }

  console.log(`\nSelesai. ${changed} file dikompres.`);
  if (totalBefore > 0) {
    console.log(`Total: ${fmt(totalBefore)} → ${fmt(totalAfter)} (hemat ${Math.round((1 - totalAfter / totalBefore) * 100)}%)`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
