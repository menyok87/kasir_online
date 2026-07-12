const paymentLabel = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer Bank',
  card: 'Kartu Debit/Kredit',
}

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

function formatDateLong(dateStr) {
  return new Date(dateStr).toLocaleString('id-ID', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDateShort(dateStr) {
  return new Date(dateStr).toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

// Deteksi Capacitor (Android/iOS)
function isCapacitor() {
  return typeof window !== 'undefined' && !!window.Capacitor
}

// ── Desktop: buka popup window ────────────────────────────────────────────────
function openPopup(html, w = 480, h = 720) {
  const win = window.open('', '_blank', `width=${w},height=${h},scrollbars=yes`)
  if (!win) {
    alert('Popup diblokir browser. Izinkan popup untuk melanjutkan.')
    return
  }
  win.document.write(html)
  win.document.close()
}

// ── Android/Capacitor: overlay fullscreen + window.print() ───────────────────
// window.print() di Android WebView membuka dialog cetak/simpan PDF native Android
function openOverlay(html, title) {
  const OVERLAY_ID = '__kasir_print_overlay__'
  document.getElementById(OVERLAY_ID)?.remove()

  const overlay = document.createElement('div')
  overlay.id = OVERLAY_ID

  const close = () => overlay.remove()

  // Tombol aksi
  const barHtml = `
    <div id="${OVERLAY_ID}_bar" style="
      position:sticky;top:0;z-index:10;
      background:#1e293b;padding:10px 14px;
      display:flex;align-items:center;gap:8px;flex-shrink:0;
    ">
      <span style="color:#94a3b8;font-size:13px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${title}</span>
      <button id="${OVERLAY_ID}_print" style="
        padding:9px 18px;background:#2563eb;color:#fff;
        border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;
        display:flex;align-items:center;gap:6px;flex-shrink:0;
      ">🖨️ Cetak / PDF</button>
      <button id="${OVERLAY_ID}_close" style="
        padding:9px 12px;background:#374151;color:#d1d5db;
        border:none;border-radius:8px;font-size:13px;cursor:pointer;flex-shrink:0;
      ">✕ Tutup</button>
    </div>`

  overlay.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:#e8ecf0;overflow-y:auto;
    display:flex;flex-direction:column;
  `

  // iframe dengan srcdoc agar terisolasi dari CSS aplikasi
  const iframe = document.createElement('iframe')
  iframe.setAttribute('srcdoc', html)
  iframe.style.cssText = 'flex:1;border:none;min-height:60vh;'

  overlay.innerHTML = barHtml
  overlay.appendChild(iframe)
  document.body.appendChild(overlay)

  document.getElementById(`${OVERLAY_ID}_close`).onclick = close
  document.getElementById(`${OVERLAY_ID}_print`).onclick = () => {
    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    } catch {
      // Fallback: cetak dari window utama dengan menyembunyikan app
      window.print()
    }
  }

  // Share via Web Share API jika tersedia (Android Chrome)
  if (navigator.share) {
    const shareBtn = document.createElement('button')
    shareBtn.textContent = '📤'
    shareBtn.title = 'Bagikan'
    shareBtn.style.cssText = `
      padding:9px 12px;background:#374151;color:#d1d5db;
      border:none;border-radius:8px;font-size:15px;cursor:pointer;flex-shrink:0;
    `
    shareBtn.onclick = async () => {
      try {
        const blob = new Blob([html], { type: 'text/html' })
        const file = new File([blob], `struk-${Date.now()}.html`, { type: 'text/html' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title })
        } else {
          await navigator.share({ title, text: title })
        }
      } catch { /* user cancelled */ }
    }
    const bar = document.getElementById(`${OVERLAY_ID}_bar`)
    bar.insertBefore(shareBtn, document.getElementById(`${OVERLAY_ID}_close`))
  }
}

// ── Pilih metode tampilan ─────────────────────────────────────────────────────
function showReceipt(html, title, popupW = 480, popupH = 720) {
  if (isCapacitor()) {
    openOverlay(html, title)
  } else {
    openPopup(html, popupW, popupH)
  }
}

// ── Thermal 80mm ──────────────────────────────────────────────────────────────
export function printReceipt(transaction, settings = {}) {
  if (!transaction) return
  const tx = transaction

  const storeName    = settings.store_name    || 'KASIR ONLINE'
  const storeTagline = settings.store_tagline  || ''
  const storeAddress = settings.store_address  || ''
  const storePhone   = settings.store_phone    || ''
  const storeEmail   = settings.store_email    || ''
  const storeLogo    = settings.store_logo     || ''
  const footerMsg    = settings.footer_msg     || 'Terima kasih telah berbelanja!'
  const showNote     = settings.show_footer_note !== false

  let paymentInfoHtml = ''
  if (tx.payment_method === 'transfer' && settings.bank_name) {
    paymentInfoHtml = `
    <hr class="sep">
    <div style="text-align:center;font-size:10px;margin:4px 0">
      <p style="font-weight:700;margin-bottom:3px;font-size:11px;">TRANSFER KE REKENING</p>
      <p style="font-weight:700;font-size:12px;">${settings.bank_name}</p>
      <p style="font-size:16px;font-weight:900;letter-spacing:2px;">${settings.bank_account_number || ''}</p>
      <p>a.n. ${settings.bank_account_name || ''}</p>
      ${settings.bank_branch ? `<p style="color:#666;font-size:9px;">${settings.bank_branch}</p>` : ''}
    </div>`
  }

  const itemRows = (tx.items || []).map(item => `
    <tr>
      <td class="item-name" colspan="2">${item.product_name}</td>
    </tr>
    <tr>
      <td class="item-qty">${item.quantity} × ${formatRupiah(item.price)}</td>
      <td class="item-sub">${formatRupiah(item.subtotal)}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html><html lang="id"><head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Struk ${tx.invoice_number}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{
      font-family:'Courier New',Courier,monospace;
      font-size:12px;color:#000;background:#fff;
      width:80mm;max-width:80mm;margin:0 auto;padding:4mm 4mm 8mm;
    }
    .store-logo{display:block;width:56px;height:56px;object-fit:contain;margin:0 auto 6px}
    .store-name{font-size:17px;font-weight:900;text-align:center;letter-spacing:3px;margin-bottom:2px}
    .store-sub{font-size:10px;text-align:center;color:#444;line-height:1.5;margin-bottom:5px}
    .sep{border:none;border-top:1px dashed #000;margin:5px 0}
    .sep-solid{border:none;border-top:2px solid #000;margin:5px 0}
    .inv{font-size:13px;font-weight:900;text-align:center;margin:4px 0;letter-spacing:1px}
    .info{width:100%;font-size:11px}
    .info td{padding:1px 0;vertical-align:top}
    .info td:last-child{text-align:right}
    .items{width:100%;font-size:11px;border-collapse:collapse;margin:4px 0}
    .items thead th{border-top:1px dashed #000;border-bottom:1px dashed #000;padding:3px 0;font-size:10px;text-transform:uppercase}
    .items thead th:last-child{text-align:right}
    .item-name{font-weight:700;padding-top:5px}
    .item-qty{color:#444;padding-bottom:4px;font-size:11px}
    .item-sub{text-align:right;font-weight:700;padding-bottom:4px;vertical-align:bottom}
    .sum{width:100%;font-size:11px;border-collapse:collapse}
    .sum td{padding:2px 0}
    .sum .r{text-align:right}
    .sum .green{color:#006600}
    .total-row td{font-size:15px;font-weight:900;padding:4px 0;border-top:2px solid #000;border-bottom:2px solid #000}
    .total-row td:last-child{text-align:right}
    .pay-row td{font-size:12px;padding-top:3px}
    .pay-row td:last-child{text-align:right}
    .change-row td{font-size:14px;font-weight:900;padding-top:1px}
    .change-row td:last-child{text-align:right}
    .footer{text-align:center;font-size:10px;color:#444;margin-top:8px;line-height:1.6}
    .status-ok{display:inline-block;border:2px solid #000;padding:1px 8px;font-weight:900;font-size:11px;letter-spacing:2px;margin:4px 0}
    @page{size:80mm auto;margin:0}
    @media print{
      body{padding:2mm}
      .no-print{display:none!important}
    }
    /* tombol hanya muncul di popup web (bukan Capacitor) */
    .print-btn{display:block;width:100%;margin-top:14px;padding:10px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:sans-serif}
    .print-btn:hover{background:#1d4ed8}
    .close-btn{display:block;width:100%;margin-top:8px;padding:8px;background:#f3f4f6;color:#374151;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-family:sans-serif}
    .close-btn:hover{background:#e5e7eb}
  </style>
</head><body>
  ${storeLogo ? `<img class="store-logo" src="${storeLogo}" alt="Logo">` : ''}
  <div class="store-name">${storeName.toUpperCase()}</div>
  <div class="store-sub">
    ${[storeTagline, storeAddress, storePhone ? 'Telp: ' + storePhone : '', storeEmail].filter(Boolean).join('<br>')}
  </div>
  <hr class="sep-solid">
  <div style="text-align:center;margin:3px 0">
    <span class="status-ok">✓ LUNAS</span>
  </div>
  <div class="inv">${tx.invoice_number}</div>
  <table class="info">
    <tr><td>Tanggal</td><td>${formatDateShort(tx.created_at)}</td></tr>
    <tr><td>Pembayaran</td><td>${paymentLabel[tx.payment_method] || tx.payment_method}</td></tr>
  </table>
  <hr class="sep">
  <table class="items">
    <thead><tr><th style="text-align:left">Produk</th><th style="text-align:right">Subtotal</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <hr class="sep">
  <table class="sum">
    <tr><td>Subtotal</td><td class="r">${formatRupiah(tx.subtotal)}</td></tr>
    ${tx.discount > 0 ? `<tr><td>Diskon</td><td class="r green">- ${formatRupiah(tx.discount)}</td></tr>` : ''}
    ${tx.tax > 0 ? `<tr><td>Pajak</td><td class="r">${formatRupiah(tx.tax)}</td></tr>` : ''}
    <tr class="total-row"><td>TOTAL</td><td>${formatRupiah(tx.grand_total)}</td></tr>
    <tr class="pay-row"><td>Bayar (${paymentLabel[tx.payment_method] || '-'})</td><td class="r">${formatRupiah(tx.amount_paid)}</td></tr>
    <tr class="change-row"><td>Kembali</td><td class="r">${formatRupiah(tx.change_amount)}</td></tr>
    ${tx.notes ? `<tr><td colspan="2" style="padding-top:4px;font-size:10px;color:#666">Catatan: ${tx.notes}</td></tr>` : ''}
  </table>
  <hr class="sep">
  ${paymentInfoHtml}
  <div class="footer">
    ${footerMsg.split('\n').map(l => `<p>${l}</p>`).join('')}
    ${showNote ? '<p style="margin-top:6px;font-size:9px">*** Simpan struk ini sebagai bukti pembelian ***</p>' : ''}
  </div>
  <!-- Tombol ini hanya tampil di popup web, bukan di overlay Capacitor -->
  <button class="print-btn no-print" onclick="window.print()">🖨️ Cetak Struk</button>
  <button class="close-btn no-print" onclick="window.close()">Tutup</button>
  <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>
</body></html>`

  showReceipt(html, `Struk ${tx.invoice_number}`, 400, 680)
}

// ── A4 / Faktur PDF ───────────────────────────────────────────────────────────
// Bagikan struk sebagai PDF (share sheet di Android; navigator.share / unduh di web)
export function shareReceipt(transaction, settings = {}) {
  return downloadPDF(transaction, settings, { share: true })
}

export async function downloadPDF(transaction, settings = {}, opts = {}) {
  if (!transaction) return
  const tx = transaction

  const storeName    = settings.store_name    || 'Kasir Online'
  const storeTagline = settings.store_tagline  || 'Point of Sale'
  const storeAddress = settings.store_address  || ''
  const storePhone   = settings.store_phone    || ''
  const storeEmail   = settings.store_email    || ''
  const storeWebsite = settings.store_website  || ''
  const footerMsg    = settings.footer_msg     || 'Terima kasih telah berbelanja!'
  const showNote     = settings.show_footer_note !== false

  const rp = n => formatRupiah(n).replace(/ /g, ' ')   // hilangkan NBSP agar rapi di PDF
  const payLabel = paymentLabel[tx.payment_method] || tx.payment_method || '-'
  const contactParts = [storeAddress, storePhone ? 'Telp: ' + storePhone : '', storeEmail, storeWebsite].filter(Boolean)

  try {
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = doc.internal.pageSize.getWidth()
    const M = 14

    // Header band biru
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, W, 30, 'F')
    doc.setTextColor(255)
    doc.setFont('helvetica', 'bold');   doc.setFontSize(18); doc.text(storeName, M, 14)
    if (storeTagline) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(storeTagline, M, 20) }
    doc.setFont('helvetica', 'bold');   doc.setFontSize(13); doc.text('FAKTUR', W - M, 13, { align: 'right' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);  doc.text('LUNAS', W - M, 19, { align: 'right' })

    let y = 38
    if (contactParts.length) {
      doc.setTextColor(100); doc.setFontSize(8)
      doc.text(contactParts.join('  ·  '), M, y); y += 7
    }

    // Info faktur
    doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    doc.text(`No. Faktur: ${tx.invoice_number}`, M, y); y += 6
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80)
    doc.text(`Tanggal    : ${formatDateLong(tx.created_at)}`, M, y); y += 5
    doc.text(`Pembayaran : ${payLabel}   ·   Item: ${(tx.items || []).reduce((s, i) => s + i.quantity, 0)} pcs`, M, y); y += 2

    // Tabel item
    autoTable(doc, {
      startY: y + 3,
      head: [['#', 'Nama Produk', 'Qty', 'Harga', 'Subtotal']],
      body: (tx.items || []).map((it, i) => [i + 1, it.product_name, it.quantity, rp(it.price), rp(it.subtotal)]),
      styles: { fontSize: 9, cellPadding: 2.4 },
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', textColor: [148, 163, 184] },
        2: { cellWidth: 16, halign: 'center' },
        3: { cellWidth: 32, halign: 'right' },
        4: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: M, right: M },
    })

    // Ringkasan (kanan)
    let ty = doc.lastAutoTable.finalY + 8
    const boxX = W - M - 82
    const sumRow = (k, v, color = [71, 85, 105]) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...color)
      doc.text(k, boxX, ty); doc.text(v, W - M, ty, { align: 'right' }); ty += 6
    }
    sumRow('Subtotal', rp(tx.subtotal))
    if (tx.discount > 0) sumRow('Diskon', '- ' + rp(tx.discount), [22, 163, 74])
    if (tx.tax > 0)      sumRow('Pajak', rp(tx.tax))
    sumRow(`Dibayar (${payLabel})`, rp(tx.amount_paid))
    sumRow('Kembalian', rp(tx.change_amount), [22, 163, 74])

    ty += 2
    doc.setFillColor(37, 99, 235)
    doc.rect(boxX - 4, ty - 5, (W - M) - (boxX - 4), 10, 'F')
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    doc.text('TOTAL', boxX, ty + 1.5); doc.text(rp(tx.grand_total), W - M, ty + 1.5, { align: 'right' })
    ty += 16

    // Footer
    doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    doc.text(footerMsg, W / 2, ty, { align: 'center' }); ty += 5
    if (showNote) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(148, 163, 184)
      doc.text('Simpan faktur ini sebagai bukti pembelian yang sah', W / 2, ty, { align: 'center' })
    }

    const fileName = `Faktur-${tx.invoice_number}.pdf`

    if (isCapacitor()) {
      // Android/iOS: tulis file PDF lalu buka share sheet (Simpan ke Files/Drive/kirim WA/dll)
      const base64 = doc.output('datauristring').split(',')[1]
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      const { Share } = await import('@capacitor/share')
      const res = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache })
      await Share.share({ title: fileName, text: `Struk ${tx.invoice_number}`, url: res.uri })
    } else if (opts.share && navigator.share) {
      // Web: bagikan file PDF via Web Share API bila didukung
      const file = new File([doc.output('blob')], fileName, { type: 'application/pdf' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName, text: `Struk ${tx.invoice_number}` })
      } else {
        doc.save(fileName)
      }
    } else {
      // Web/desktop: unduh langsung
      doc.save(fileName)
    }
  } catch (err) {
    console.error('[PDF] Gagal membuat PDF:', err)
    alert('Gagal membuat PDF faktur. Coba lagi.')
  }
  return
}
