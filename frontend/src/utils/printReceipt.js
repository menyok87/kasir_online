/**
 * Cetak struk ke popup window terpisah agar hanya konten struk yang dicetak.
 * Kompatibel dengan printer thermal 80mm maupun printer biasa.
 */

const STORE_NAME  = 'KASIR ONLINE'
const STORE_ADDR  = 'Jl. Toko No. 1, Kota Anda'
const STORE_PHONE = 'Telp: 0812-3456-7890'
const FOOTER_MSG  = 'Terima kasih telah berbelanja!\nBarang yang sudah dibeli\ntidak dapat dikembalikan.'

const paymentLabel = { cash: 'Tunai', transfer: 'Transfer Bank', card: 'Kartu Debit/Kredit' }

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

function pad(str, len, right = false) {
  const s = String(str)
  if (right) return s.padStart(len, ' ')
  return s.padEnd(len, ' ')
}

function line(char = '-', len = 40) {
  return char.repeat(len)
}

/**
 * @param {object} transaction  — data transaksi dari API (termasuk .items[])
 */
export function printReceipt(transaction) {
  if (!transaction) return

  const tx = transaction
  const win = window.open('', '_blank', 'width=400,height=700,scrollbars=yes')
  if (!win) {
    alert('Popup diblokir browser. Izinkan popup untuk mencetak struk.')
    return
  }

  const now = new Date(tx.created_at).toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

  // Baris item
  const itemRows = (tx.items || []).map(item => {
    const nameLine  = item.product_name
    const qtyPrice  = `${item.quantity} x ${formatRupiah(item.price)}`
    const subtotal  = formatRupiah(item.subtotal)
    return `
      <tr>
        <td colspan="2" class="item-name">${nameLine}</td>
      </tr>
      <tr>
        <td class="item-qty">${qtyPrice}</td>
        <td class="item-subtotal">${subtotal}</td>
      </tr>`
  }).join('')

  // Baris summary
  const discountRow = tx.discount > 0
    ? `<tr><td>Diskon</td><td class="right discount">- ${formatRupiah(tx.discount)}</td></tr>` : ''
  const taxRow = tx.tax > 0
    ? `<tr><td>Pajak</td><td class="right">${formatRupiah(tx.tax)}</td></tr>` : ''

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Struk - ${tx.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      color: #000;
      background: #fff;
      width: 80mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 4mm 4mm 8mm;
    }

    /* ── Header ── */
    .store-name {
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 2px;
      margin-bottom: 2px;
    }
    .store-info {
      font-size: 10px;
      text-align: center;
      color: #333;
      line-height: 1.5;
      margin-bottom: 6px;
    }
    .separator {
      border: none;
      border-top: 1px dashed #000;
      margin: 5px 0;
    }
    .separator-solid {
      border: none;
      border-top: 1px solid #000;
      margin: 5px 0;
    }

    /* ── Info transaksi ── */
    .info-table {
      width: 100%;
      font-size: 11px;
      margin-bottom: 2px;
    }
    .info-table td { padding: 1px 0; vertical-align: top; }
    .info-table td:last-child { text-align: right; }
    .invoice-num {
      font-size: 13px;
      font-weight: bold;
      text-align: center;
      margin: 4px 0;
      letter-spacing: 1px;
    }

    /* ── Item tabel ── */
    .items-table {
      width: 100%;
      font-size: 11px;
      border-collapse: collapse;
      margin: 4px 0;
    }
    .items-table thead th {
      border-top: 1px dashed #000;
      border-bottom: 1px dashed #000;
      padding: 3px 0;
      font-size: 10px;
      text-transform: uppercase;
    }
    .items-table thead th:last-child { text-align: right; }
    .items-table .item-name { font-weight: bold; padding-top: 4px; }
    .items-table .item-qty  { color: #333; padding-bottom: 3px; }
    .items-table .item-subtotal { text-align: right; font-weight: bold; padding-bottom: 3px; vertical-align: bottom; }

    /* ── Summary ── */
    .summary-table {
      width: 100%;
      font-size: 11px;
      border-collapse: collapse;
    }
    .summary-table td { padding: 2px 0; }
    .summary-table .right { text-align: right; }
    .summary-table .discount { color: #008000; }
    .summary-table .total-row td {
      font-size: 14px;
      font-weight: bold;
      padding: 4px 0;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
    }
    .summary-table .total-row td:last-child { text-align: right; }
    .summary-table .payment-method {
      font-size: 10px;
      color: #555;
    }
    .summary-table .change-row td {
      font-weight: bold;
      font-size: 13px;
    }
    .summary-table .change-row td:last-child { text-align: right; }

    /* ── Footer ── */
    .footer {
      text-align: center;
      font-size: 10px;
      color: #333;
      margin-top: 8px;
      line-height: 1.6;
    }
    .footer p { margin: 1px 0; }

    /* ── Print settings ── */
    @page {
      size: 80mm auto;
      margin: 0;
    }
    @media print {
      body { padding: 2mm; }
      .no-print { display: none !important; }
    }

    /* ── Preview tombol (tidak ikut cetak) ── */
    .print-btn {
      display: block;
      width: 100%;
      margin-top: 16px;
      padding: 10px;
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      font-family: sans-serif;
    }
    .print-btn:hover { background: #1d4ed8; }
    .close-btn {
      display: block;
      width: 100%;
      margin-top: 8px;
      padding: 8px;
      background: #f3f4f6;
      color: #374151;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      cursor: pointer;
      font-family: sans-serif;
    }
    .close-btn:hover { background: #e5e7eb; }
  </style>
</head>
<body>

  <!-- ── Kop Toko ── -->
  <div class="store-name">${STORE_NAME}</div>
  <div class="store-info">
    ${STORE_ADDR}<br>
    ${STORE_PHONE}
  </div>

  <hr class="separator-solid">

  <!-- ── Nomor Faktur & Waktu ── -->
  <div class="invoice-num">${tx.invoice_number}</div>
  <table class="info-table">
    <tr><td>Tanggal</td><td>${now}</td></tr>
    <tr><td>Kasir</td><td>Admin</td></tr>
    <tr><td>Pembayaran</td><td>${paymentLabel[tx.payment_method] || tx.payment_method}</td></tr>
  </table>

  <hr class="separator">

  <!-- ── Daftar Item ── -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="text-align:left">Nama Produk</th>
        <th style="text-align:right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <hr class="separator">

  <!-- ── Ringkasan Pembayaran ── -->
  <table class="summary-table">
    <tr>
      <td>Subtotal</td>
      <td class="right">${formatRupiah(tx.subtotal)}</td>
    </tr>
    ${discountRow}
    ${taxRow}
    <tr class="total-row">
      <td>TOTAL</td>
      <td>${formatRupiah(tx.grand_total)}</td>
    </tr>
    <tr>
      <td>Bayar</td>
      <td class="right">${formatRupiah(tx.amount_paid)}</td>
    </tr>
    <tr class="change-row">
      <td>Kembali</td>
      <td class="right">${formatRupiah(tx.change_amount)}</td>
    </tr>
    ${tx.notes ? `<tr><td colspan="2" style="padding-top:4px;font-size:10px;color:#555">Catatan: ${tx.notes}</td></tr>` : ''}
  </table>

  <hr class="separator">

  <!-- ── Footer ── -->
  <div class="footer">
    ${FOOTER_MSG.split('\n').map(l => `<p>${l}</p>`).join('')}
    <p style="margin-top:6px;font-size:9px">*** Simpan struk ini sebagai bukti pembelian ***</p>
  </div>

  <!-- ── Tombol Cetak (hilang saat print) ── -->
  <button class="print-btn no-print" onclick="window.print()">🖨️ Cetak Struk</button>
  <button class="close-btn no-print" onclick="window.close()">Tutup</button>

  <script>
    // Auto-buka dialog cetak setelah halaman siap
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`

  win.document.write(html)
  win.document.close()
}
