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

function openWin(html, w = 480, h = 720) {
  const win = window.open('', '_blank', `width=${w},height=${h},scrollbars=yes`)
  if (!win) {
    alert('Popup diblokir browser. Izinkan popup untuk melanjutkan.')
    return null
  }
  win.document.write(html)
  win.document.close()
  return win
}

// ── Thermal 80mm receipt ──────────────────────────────────────────────────────
export function printReceipt(transaction, settings = {}) {
  if (!transaction) return
  const tx = transaction

  const storeName    = settings.store_name    || 'KASIR ONLINE'
  const storeTagline = settings.store_tagline  || ''
  const storeAddress = settings.store_address  || ''
  const storePhone   = settings.store_phone    || ''
  const storeEmail   = settings.store_email    || ''
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
  <title>Struk ${tx.invoice_number}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{
      font-family:'Courier New',Courier,monospace;
      font-size:12px;color:#000;background:#fff;
      width:80mm;max-width:80mm;margin:0 auto;padding:4mm 4mm 8mm;
    }
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
    @media print{body{padding:2mm}.no-print{display:none!important}}
    .print-btn{display:block;width:100%;margin-top:14px;padding:10px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:sans-serif}
    .print-btn:hover{background:#1d4ed8}
    .close-btn{display:block;width:100%;margin-top:8px;padding:8px;background:#f3f4f6;color:#374151;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-family:sans-serif}
    .close-btn:hover{background:#e5e7eb}
  </style>
</head><body>
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
  <button class="print-btn no-print" onclick="window.print()">🖨️ Cetak Struk</button>
  <button class="close-btn no-print" onclick="window.close()">Tutup</button>
  <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
</body></html>`

  openWin(html, 400, 680)
}

// ── A4 PDF receipt ────────────────────────────────────────────────────────────
export function downloadPDF(transaction, settings = {}) {
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

  const contactParts = [storeAddress, storePhone ? '📞 ' + storePhone : '', storeEmail, storeWebsite].filter(Boolean)

  const itemRows = (tx.items || []).map((item, i) => `
    <tr class="${i % 2 === 1 ? 'row-alt' : ''}">
      <td class="num">${i + 1}</td>
      <td class="pname">${item.product_name}</td>
      <td class="center qty">${item.quantity}</td>
      <td class="right dim">${formatRupiah(item.price)}</td>
      <td class="right bold">${formatRupiah(item.subtotal)}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html><html lang="id"><head>
  <meta charset="UTF-8">
  <title>Faktur ${tx.invoice_number} — ${storeName}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
      background:#e8ecf0;min-height:100vh;
    }
    /* Action bar — hidden on print */
    .action-bar{
      position:sticky;top:0;z-index:100;
      background:#1e293b;padding:10px 16px;
      display:flex;align-items:center;gap:10px;
    }
    .action-bar span{color:#94a3b8;font-size:13px;flex:1}
    .abtn{padding:9px 18px;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px}
    .abtn-blue{background:#2563eb;color:#fff}
    .abtn-blue:hover{background:#1d4ed8}
    .abtn-gray{background:#374151;color:#d1d5db}
    .abtn-gray:hover{background:#4b5563}

    /* Receipt wrapper */
    .wrap{max-width:800px;margin:24px auto;background:#fff;box-shadow:0 8px 40px rgba(0,0,0,.15);border-radius:12px;overflow:hidden}

    /* Header */
    .hdr{background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 60%,#1e40af 100%);color:#fff;padding:36px 40px 32px}
    .hdr-top{display:flex;justify-content:space-between;align-items:flex-start}
    .hdr-logo{display:flex;align-items:center;gap:14px}
    .hdr-icon{width:48px;height:48px;background:rgba(255,255,255,.2);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px}
    .store-name{font-size:26px;font-weight:800;letter-spacing:-.5px}
    .store-tagline{font-size:13px;opacity:.75;margin-top:2px}
    .hdr-badge{background:rgba(255,255,255,.15);backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,.25);border-radius:8px;padding:8px 16px;text-align:right}
    .hdr-badge .label{font-size:10px;opacity:.7;text-transform:uppercase;font-weight:600;letter-spacing:.5px}
    .hdr-badge .doc-type{font-size:18px;font-weight:800;margin-top:2px}
    .contact{margin-top:16px;font-size:12px;opacity:.7;line-height:1.6}

    /* Invoice banner */
    .inv-bar{background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:18px 40px;display:flex;justify-content:space-between;align-items:center}
    .inv-bar .lbl{font-size:10px;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:.5px;margin-bottom:4px}
    .inv-bar .inv-num{font-size:20px;font-weight:800;color:#0f172a;letter-spacing:.5px}
    .status-badge{background:#dcfce7;color:#15803d;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:700;border:1px solid #bbf7d0;display:flex;align-items:center;gap:5px}

    /* Body */
    .body{padding:32px 40px}

    /* Info grid */
    .info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #f1f5f9}
    .info-item .lbl{font-size:10px;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:.5px;margin-bottom:5px}
    .info-item .val{font-size:14px;color:#0f172a;font-weight:600}

    /* Items table */
    .section-title{font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:.5px;margin-bottom:10px}
    .tbl{width:100%;border-collapse:collapse;margin-bottom:24px}
    .tbl thead th{background:#f1f5f9;padding:10px 12px;font-size:11px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.3px;border-bottom:2px solid #e2e8f0}
    .tbl thead th:first-child{border-radius:8px 0 0 0}
    .tbl thead th:last-child{border-radius:0 8px 0 0}
    .tbl tbody td{padding:12px 12px;font-size:13px;color:#1e293b;border-bottom:1px solid #f1f5f9;vertical-align:middle}
    .row-alt td{background:#fafafa}
    .num{color:#94a3b8;font-size:12px;width:32px}
    .pname{font-weight:600}
    .center{text-align:center}
    .right{text-align:right}
    .dim{color:#64748b;font-size:12px}
    .bold{font-weight:700}
    .qty{color:#475569}

    /* Summary */
    .summary-wrap{display:flex;justify-content:flex-end}
    .summary-box{min-width:300px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}
    .sum-row{display:flex;justify-content:space-between;padding:10px 16px;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9}
    .sum-row:last-child{border-bottom:none}
    .sum-row .k{font-weight:500}
    .sum-row .v{font-weight:600;color:#1e293b}
    .sum-row.discount .v{color:#16a34a}
    .sum-row.change .k,.sum-row.change .v{color:#16a34a;font-weight:700}
    .sum-total{background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:14px 16px;display:flex;justify-content:space-between;align-items:center}
    .sum-total .k{font-size:14px;font-weight:700;color:#fff}
    .sum-total .v{font-size:22px;font-weight:900;color:#fff}

    /* Footer */
    .ftr{border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center}
    .ftr .msg{font-size:15px;color:#475569;font-weight:600;margin-bottom:6px}
    .ftr .note{font-size:11px;color:#94a3b8}
    .ftr .powered{margin-top:12px;font-size:11px;color:#cbd5e1}

    @media print{
      body{background:#fff}
      .no-print{display:none!important}
      .wrap{max-width:100%;margin:0;box-shadow:none;border-radius:0}
      @page{size:A4;margin:0}
    }
  </style>
</head><body>

  <!-- Action bar -->
  <div class="action-bar no-print">
    <span>Preview Faktur — ${tx.invoice_number}</span>
    <button class="abtn abtn-blue" onclick="window.print()">
      <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
      Cetak / Simpan PDF
    </button>
    <button class="abtn abtn-gray" onclick="window.close()">✕ Tutup</button>
  </div>

  <div class="wrap">

    <!-- Header -->
    <div class="hdr">
      <div class="hdr-top">
        <div class="hdr-logo">
          <div class="hdr-icon">🏪</div>
          <div>
            <div class="store-name">${storeName}</div>
            ${storeTagline ? `<div class="store-tagline">${storeTagline}</div>` : ''}
          </div>
        </div>
        <div class="hdr-badge">
          <div class="label">Dokumen</div>
          <div class="doc-type">FAKTUR</div>
        </div>
      </div>
      ${contactParts.length ? `<div class="contact">${contactParts.join('&nbsp; · &nbsp;')}</div>` : ''}
    </div>

    <!-- Invoice banner -->
    <div class="inv-bar">
      <div>
        <div class="lbl">Nomor Faktur</div>
        <div class="inv-num">${tx.invoice_number}</div>
      </div>
      <div class="status-badge">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
        LUNAS
      </div>
    </div>

    <!-- Body -->
    <div class="body">

      <!-- Meta info -->
      <div class="info-grid">
        <div class="info-item">
          <div class="lbl">Tanggal & Waktu</div>
          <div class="val">${formatDateLong(tx.created_at)}</div>
        </div>
        <div class="info-item">
          <div class="lbl">Metode Pembayaran</div>
          <div class="val">${paymentLabel[tx.payment_method] || tx.payment_method}</div>
        </div>
        <div class="info-item">
          <div class="lbl">Jumlah Item</div>
          <div class="val">${(tx.items || []).reduce((s, i) => s + i.quantity, 0)} pcs</div>
        </div>
      </div>

      <!-- Item table -->
      <div class="section-title">Detail Pembelian</div>
      <table class="tbl">
        <thead>
          <tr>
            <th style="text-align:left;width:32px">#</th>
            <th style="text-align:left">Nama Produk</th>
            <th style="text-align:center;width:60px">Qty</th>
            <th style="text-align:right;width:120px">Harga Satuan</th>
            <th style="text-align:right;width:120px">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <!-- Summary -->
      <div class="summary-wrap">
        <div class="summary-box">
          <div class="sum-row"><span class="k">Subtotal</span><span class="v">${formatRupiah(tx.subtotal)}</span></div>
          ${tx.discount > 0 ? `<div class="sum-row discount"><span class="k">Diskon</span><span class="v">− ${formatRupiah(tx.discount)}</span></div>` : ''}
          ${tx.tax > 0 ? `<div class="sum-row"><span class="k">Pajak</span><span class="v">${formatRupiah(tx.tax)}</span></div>` : ''}
          <div class="sum-row"><span class="k">Dibayar (${paymentLabel[tx.payment_method] || '-'})</span><span class="v">${formatRupiah(tx.amount_paid)}</span></div>
          <div class="sum-row change"><span class="k">Kembalian</span><span class="v">${formatRupiah(tx.change_amount)}</span></div>
          <div class="sum-total"><span class="k">TOTAL</span><span class="v">${formatRupiah(tx.grand_total)}</span></div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="ftr">
      <div class="msg">${footerMsg}</div>
      ${showNote ? '<div class="note">Simpan faktur ini sebagai bukti pembelian yang sah</div>' : ''}
      <div class="powered">Powered by ${storeName}</div>
    </div>

  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 500);
    };
  </script>
</body></html>`

  openWin(html, 860, 720)
}
