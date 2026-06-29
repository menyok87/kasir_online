// ── Buku Besar / General Ledger helpers ───────────────────────────────────────
// Double-entry: setiap transaksi menghasilkan minimal 2 baris (debit = kredit).
// Saldo akun (accounts.balance) ikut diperbarui sesuai sisi normal akun, agar
// Neraca & Laba Rugi yang membaca accounts.balance tetap sinkron.

// Sisi normal akun
const DEBIT_NORMAL  = ['kas', 'bank', 'piutang', 'beban']      // saldo += debit - kredit
const CREDIT_NORMAL = ['hutang', 'modal', 'pendapatan']        // saldo += kredit - debit

// Perubahan saldo (signed) untuk satu baris jurnal berdasarkan tipe akun
function balanceDelta(type, debit, credit) {
  const d = Number(debit) || 0
  const c = Number(credit) || 0
  return DEBIT_NORMAL.includes(type) ? d - c : c - d
}

// Cari akun aktif pertama bertipe tertentu; buat default bila belum ada.
async function ensureAccount(client, adminId, { code, name, type, description }) {
  const found = await client.query(
    `SELECT id FROM accounts WHERE admin_id = $1 AND type = $2 AND is_active = TRUE ORDER BY code LIMIT 1`,
    [adminId, type]
  )
  if (found.rows.length) return found.rows[0].id

  const ins = await client.query(
    `INSERT INTO accounts (admin_id, code, name, type, description)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (code, admin_id) DO UPDATE SET is_active = TRUE
     RETURNING id`,
    [adminId, code, name, type, description || '']
  )
  return ins.rows[0].id
}

// Posting sekumpulan baris jurnal yang sudah balanced.
// lines: [{ account_id, type, debit, credit, description }]
async function postEntries(client, adminId, { transactionId = null, ref = null, entryDate = null, source = 'manual', lines }) {
  for (const ln of lines) {
    await client.query(
      `INSERT INTO journal_entries
         (admin_id, account_id, transaction_id, entry_date, ref, description, debit, credit, source)
       VALUES ($1, $2, $3, COALESCE($4, NOW()), $5, $6, $7, $8, $9)`,
      [adminId, ln.account_id, transactionId, entryDate, ref, ln.description || '', ln.debit || 0, ln.credit || 0, source]
    )
    await client.query(
      `UPDATE accounts SET balance = balance + $1 WHERE id = $2`,
      [balanceDelta(ln.type, ln.debit, ln.credit), ln.account_id]
    )
  }
}

// Apakah transaksi ini sudah pernah dijurnal? (cegah double-posting GoPay)
async function alreadyPosted(client, adminId, transactionId) {
  const { rows } = await client.query(
    `SELECT 1 FROM journal_entries WHERE transaction_id = $1 AND admin_id = $2 LIMIT 1`,
    [transactionId, adminId]
  )
  return rows.length > 0
}

// Posting satu transaksi penjualan: Dr Kas/Bank, Cr Pendapatan (sebesar grand_total).
async function postSale(client, adminId, tx) {
  if (await alreadyPosted(client, adminId, tx.id)) return

  const amount = Number(tx.grand_total)
  if (!amount || amount <= 0) return

  const isCash    = tx.payment_method === 'cash'
  const assetType = isCash ? 'kas' : 'bank'
  const assetId   = await ensureAccount(client, adminId, isCash
    ? { code: '1-1001', name: 'Kas Tunai', type: 'kas',  description: 'Uang tunai di tangan' }
    : { code: '1-1002', name: 'Bank',      type: 'bank', description: 'Rekening bank utama' })
  const revenueId = await ensureAccount(client, adminId,
    { code: '4-1001', name: 'Pendapatan Penjualan', type: 'pendapatan', description: 'Penerimaan dari penjualan' })

  const label = `Penjualan ${tx.invoice_number}`
  await postEntries(client, adminId, {
    transactionId: tx.id,
    ref:           tx.invoice_number,
    entryDate:     tx.created_at || null,
    source:        'sale',
    lines: [
      { account_id: assetId,   type: assetType,    debit: amount, credit: 0,      description: label },
      { account_id: revenueId, type: 'pendapatan', debit: 0,      credit: amount, description: label },
    ],
  })
}

// Reversal: hapus jurnal transaksi & kembalikan saldo akun. Dipakai saat
// transaksi dibatalkan / dihapus.
async function reverseTransaction(client, adminId, transactionId) {
  const { rows } = await client.query(
    `SELECT je.id, je.account_id, je.debit, je.credit, a.type
       FROM journal_entries je
       JOIN accounts a ON a.id = je.account_id
      WHERE je.transaction_id = $1 AND je.admin_id = $2`,
    [transactionId, adminId]
  )
  for (const e of rows) {
    await client.query(
      `UPDATE accounts SET balance = balance - $1 WHERE id = $2`,
      [balanceDelta(e.type, e.debit, e.credit), e.account_id]
    )
  }
  await client.query(
    `DELETE FROM journal_entries WHERE transaction_id = $1 AND admin_id = $2`,
    [transactionId, adminId]
  )
}

module.exports = {
  DEBIT_NORMAL, CREDIT_NORMAL,
  balanceDelta, ensureAccount, postEntries, alreadyPosted,
  postSale, reverseTransaction,
}
