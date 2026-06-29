const express = require('express')
const router  = express.Router()
const pool    = require('../database/db')
const { authenticate, requireAdmin, requireManager, tenantId } = require('../middleware/authMiddleware')
const { DEBIT_NORMAL, postEntries } = require('../utils/ledger')

const sign = type => (DEBIT_NORMAL.includes(type) ? 1 : -1)
const n    = v => Number(v) || 0

// Default bulan = bulan berjalan (YYYY-MM)
function thisMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const isMonth = s => /^\d{4}-\d{2}$/.test(s)
const isYear  = s => /^\d{4}$/.test(s)

// GET /api/ledger/months — daftar bulan yang punya entri (untuk pemilih bulan)
router.get('/months', authenticate, requireManager, async (req, res, next) => {
  try {
    const tid = tenantId(req.user)
    const { rows } = await pool.query(
      `SELECT DISTINCT to_char(entry_date, 'YYYY-MM') AS month
         FROM journal_entries WHERE admin_id = $1 ORDER BY month DESC`,
      [tid]
    )
    const months = rows.map(r => r.month)
    const cur = thisMonth()
    if (!months.includes(cur)) months.unshift(cur)
    res.json(months)
  } catch (err) { next(err) }
})

// GET /api/ledger?month=YYYY-MM — rekap Buku Besar per akun untuk satu bulan
router.get('/', authenticate, requireManager, async (req, res, next) => {
  try {
    const tid   = tenantId(req.user)
    const month = isMonth(req.query.month) ? req.query.month : thisMonth()
    const start = `${month}-01`

    const { rows } = await pool.query(
      `SELECT a.id, a.code, a.name, a.type,
         COALESCE(SUM(je.debit)  FILTER (WHERE je.entry_date <  $2::date), 0) AS pre_debit,
         COALESCE(SUM(je.credit) FILTER (WHERE je.entry_date <  $2::date), 0) AS pre_credit,
         COALESCE(SUM(je.debit)  FILTER (WHERE je.entry_date >= $2::date AND je.entry_date < $2::date + INTERVAL '1 month'), 0) AS mdebit,
         COALESCE(SUM(je.credit) FILTER (WHERE je.entry_date >= $2::date AND je.entry_date < $2::date + INTERVAL '1 month'), 0) AS mcredit
       FROM accounts a
       LEFT JOIN journal_entries je ON je.account_id = a.id AND je.admin_id = $1
       WHERE a.admin_id = $1 AND a.is_active = TRUE
       GROUP BY a.id, a.code, a.name, a.type
       ORDER BY a.code`,
      [tid, start]
    )

    let totalDebit = 0, totalCredit = 0, pendapatan = 0, beban = 0
    const accounts = rows.map(r => {
      const s       = sign(r.type)
      const opening = s * (n(r.pre_debit) - n(r.pre_credit))
      const debit   = n(r.mdebit)
      const credit  = n(r.mcredit)
      const closing = opening + s * (debit - credit)
      totalDebit  += debit
      totalCredit += credit
      if (r.type === 'pendapatan') pendapatan += credit - debit
      if (r.type === 'beban')      beban      += debit - credit
      return { id: r.id, code: r.code, name: r.name, type: r.type, opening, debit, credit, closing }
    })

    res.json({
      month,
      accounts,
      totals:  { debit: totalDebit, credit: totalCredit },
      summary: { pendapatan, beban, laba: pendapatan - beban },
    })
  } catch (err) { next(err) }
})

// GET /api/ledger/account/:id?month=YYYY-MM — detail entri satu akun + saldo berjalan
router.get('/account/:id', authenticate, requireManager, async (req, res, next) => {
  try {
    const tid   = tenantId(req.user)
    const month = isMonth(req.query.month) ? req.query.month : thisMonth()
    const start = `${month}-01`

    const { rows: accRows } = await pool.query(
      'SELECT id, code, name, type FROM accounts WHERE id = $1 AND admin_id = $2',
      [req.params.id, tid]
    )
    if (!accRows.length) return res.status(404).json({ error: 'Akun tidak ditemukan' })
    const account = accRows[0]
    const s = sign(account.type)

    const { rows: openRows } = await pool.query(
      `SELECT COALESCE(SUM(debit),0) AS d, COALESCE(SUM(credit),0) AS c
         FROM journal_entries
        WHERE account_id = $1 AND admin_id = $2 AND entry_date < $3::date`,
      [account.id, tid, start]
    )
    const opening = s * (n(openRows[0].d) - n(openRows[0].c))

    const { rows: entries } = await pool.query(
      `SELECT id, entry_date, ref, description, debit, credit, source
         FROM journal_entries
        WHERE account_id = $1 AND admin_id = $2
          AND entry_date >= $3::date AND entry_date < $3::date + INTERVAL '1 month'
        ORDER BY entry_date, id`,
      [account.id, tid, start]
    )

    let running = opening, debit = 0, credit = 0
    const list = entries.map(e => {
      running += s * (n(e.debit) - n(e.credit))
      debit  += n(e.debit)
      credit += n(e.credit)
      return {
        id: e.id, entry_date: e.entry_date, ref: e.ref, description: e.description,
        debit: n(e.debit), credit: n(e.credit), source: e.source, balance: running,
      }
    })

    res.json({ account, month, opening, entries: list, debit, credit, closing: running })
  } catch (err) { next(err) }
})

// GET /api/ledger/summary?year=YYYY — rekap 12 bulan (pendapatan, beban, laba, jml transaksi)
router.get('/summary', authenticate, requireManager, async (req, res, next) => {
  try {
    const tid  = tenantId(req.user)
    const year = isYear(req.query.year) ? req.query.year : String(new Date().getFullYear())
    const start = `${year}-01-01`

    const { rows: movRows } = await pool.query(
      `SELECT to_char(je.entry_date, 'YYYY-MM') AS month,
         COALESCE(SUM(CASE WHEN a.type = 'pendapatan' THEN je.credit - je.debit ELSE 0 END), 0) AS pendapatan,
         COALESCE(SUM(CASE WHEN a.type = 'beban'      THEN je.debit - je.credit ELSE 0 END), 0) AS beban
       FROM journal_entries je
       JOIN accounts a ON a.id = je.account_id
       WHERE je.admin_id = $1 AND je.entry_date >= $2::date AND je.entry_date < $2::date + INTERVAL '1 year'
       GROUP BY month`,
      [tid, start]
    )
    const { rows: txRows } = await pool.query(
      `SELECT to_char(created_at, 'YYYY-MM') AS month, COUNT(*)::int AS cnt
         FROM transactions
        WHERE admin_id = $1 AND created_at >= $2::date AND created_at < $2::date + INTERVAL '1 year'
        GROUP BY month`,
      [tid, start]
    )

    const movMap = Object.fromEntries(movRows.map(r => [r.month, r]))
    const txMap  = Object.fromEntries(txRows.map(r => [r.month, r.cnt]))

    const months = []
    let totPendapatan = 0, totBeban = 0, totTransaksi = 0
    for (let m = 1; m <= 12; m++) {
      const key        = `${year}-${String(m).padStart(2, '0')}`
      const pendapatan = n(movMap[key]?.pendapatan)
      const beban      = n(movMap[key]?.beban)
      const transaksi  = n(txMap[key])
      totPendapatan += pendapatan; totBeban += beban; totTransaksi += transaksi
      months.push({ month: key, pendapatan, beban, laba: pendapatan - beban, transaksi })
    }

    res.json({
      year,
      months,
      total: {
        pendapatan: totPendapatan, beban: totBeban,
        laba: totPendapatan - totBeban, transaksi: totTransaksi,
      },
    })
  } catch (err) { next(err) }
})

// POST /api/ledger/manual — jurnal manual (mis. catat beban gaji, sewa, setoran modal)
router.post('/manual', authenticate, requireAdmin, async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { entry_date, debit_account_id, credit_account_id, amount, description = '', ref = '' } = req.body
    const amt = Number(amount)

    if (!debit_account_id || !credit_account_id) {
      return res.status(400).json({ error: 'Akun debit dan kredit wajib dipilih' })
    }
    if (Number(debit_account_id) === Number(credit_account_id)) {
      return res.status(400).json({ error: 'Akun debit dan kredit tidak boleh sama' })
    }
    if (!amt || amt <= 0) {
      return res.status(400).json({ error: 'Nominal harus lebih dari 0' })
    }

    const tid = tenantId(req.user)
    const { rows: accs } = await client.query(
      'SELECT id, type FROM accounts WHERE id IN ($1, $2) AND admin_id = $3 AND is_active = TRUE',
      [debit_account_id, credit_account_id, tid]
    )
    if (accs.length !== 2) {
      return res.status(400).json({ error: 'Akun tidak valid' })
    }
    const typeOf = id => accs.find(a => a.id === Number(id))?.type

    await client.query('BEGIN')
    await postEntries(client, tid, {
      ref:       ref?.trim() || null,
      entryDate: entry_date ? new Date(entry_date) : null,
      source:    'manual',
      lines: [
        { account_id: Number(debit_account_id),  type: typeOf(debit_account_id),  debit: amt, credit: 0,   description },
        { account_id: Number(credit_account_id), type: typeOf(credit_account_id), debit: 0,   credit: amt, description },
      ],
    })
    await client.query('COMMIT')
    res.status(201).json({ message: 'Jurnal manual berhasil dicatat' })
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
})

module.exports = router
