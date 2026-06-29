import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, Trash2, BookOpen, Search, X,
  Wallet, Building2, Users, TrendingUp, TrendingDown,
  ReceiptText, Scale, ChevronDown, ChevronUp, Info,
  BookText, Calendar, ArrowRightLeft, CalendarDays,
} from 'lucide-react'
import {
  getAccounts, createAccount, updateAccount, deleteAccount,
  getLedger, getLedgerMonths, getLedgerAccount, getLedgerSummary, postManualJournal,
} from '../api'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { FullPageSpinner } from '../components/ui/Spinner'

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
}

const TYPE_CONFIG = {
  kas:        { label: 'Kas',        group: 'Aset',       side: 'D', color: 'blue',    bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-300',    icon: Wallet },
  bank:       { label: 'Bank',       group: 'Aset',       side: 'D', color: 'sky',     bg: 'bg-sky-100 dark:bg-sky-900/30',      text: 'text-sky-700 dark:text-sky-300',      icon: Building2 },
  piutang:    { label: 'Piutang',    group: 'Aset',       side: 'D', color: 'teal',    bg: 'bg-teal-100 dark:bg-teal-900/30',    text: 'text-teal-700 dark:text-teal-300',    icon: ReceiptText },
  hutang:     { label: 'Hutang',     group: 'Kewajiban',  side: 'K', color: 'red',     bg: 'bg-red-100 dark:bg-red-900/30',      text: 'text-red-700 dark:text-red-300',      icon: TrendingDown },
  modal:      { label: 'Modal',      group: 'Ekuitas',    side: 'K', color: 'purple',  bg: 'bg-purple-100 dark:bg-purple-900/30',text: 'text-purple-700 dark:text-purple-300',icon: Users },
  pendapatan: { label: 'Pendapatan', group: 'Pendapatan', side: 'K', color: 'green',   bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-300',  icon: TrendingUp },
  beban:      { label: 'Beban',      group: 'Beban',      side: 'D', color: 'orange',  bg: 'bg-orange-100 dark:bg-orange-900/30',text: 'text-orange-700 dark:text-orange-300',icon: TrendingDown },
}

const TYPE_OPTIONS = Object.entries(TYPE_CONFIG).map(([value, { label, group }]) => ({ value, label: `${label} (${group})` }))
const GROUP_ORDER  = ['Aset', 'Kewajiban', 'Ekuitas', 'Pendapatan', 'Beban']

const CODE_PREFIX = { kas: '1-1', bank: '1-2', piutang: '1-3', hutang: '2-1', modal: '3-1', pendapatan: '4-1', beban: '5-1' }

function groupAccounts(accounts) {
  const map = {}
  for (const acc of accounts) {
    const g = TYPE_CONFIG[acc.type]?.group || 'Lainnya'
    if (!map[g]) map[g] = []
    map[g].push(acc)
  }
  return GROUP_ORDER.filter(g => map[g]).map(g => ({ group: g, items: map[g] }))
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, gradient, textColor }) {
  return (
    <div className={`rounded-2xl p-4 ${gradient} relative overflow-hidden`}>
      <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/10" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">{label}</span>
          {Icon && <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center"><Icon size={14} className="text-white" /></div>}
        </div>
        <p className={`text-xl font-black ${textColor || 'text-white'} leading-none`}>{value}</p>
        {sub && <p className="text-xs text-white/60 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ── Form Akun ─────────────────────────────────────────────────────────────────
function AccountForm({ initial, onSubmit, onClose }) {
  const [form, setForm] = useState({
    code:        initial?.code        || '',
    name:        initial?.name        || '',
    type:        initial?.type        || 'kas',
    balance:     initial?.balance     ?? '',
    description: initial?.description || '',
    is_active:   initial?.is_active   ?? true,
  })
  const [loading, setLoading] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  function handleTypeChange(e) {
    const type = e.target.value
    setForm(f => ({
      ...f, type,
      code: f.code || CODE_PREFIX[type] || '',
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit({ ...form, balance: Number(form.balance) || 0 })
    } finally { setLoading(false) }
  }

  const cfg = TYPE_CONFIG[form.type]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tipe + indikator */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Tipe Akun <span className="text-red-500">*</span>
          </label>
          <select className="input text-sm" value={form.type} onChange={handleTypeChange}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Kode Akun <span className="text-red-500">*</span>
          </label>
          <input className="input font-mono text-sm" value={form.code}
            onChange={set('code')} required placeholder={CODE_PREFIX[form.type] + 'xxx'} />
        </div>
      </div>

      {/* Info tipe */}
      {cfg && (
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs ${cfg.bg}`}>
          <Info size={13} className={cfg.text} />
          <span className={`${cfg.text} font-medium`}>
            Kelompok: <strong>{cfg.group}</strong> &nbsp;·&nbsp;
            Saldo Normal: <strong>{cfg.side === 'D' ? 'Debit (D)' : 'Kredit (K)'}</strong>
          </span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
          Nama Akun <span className="text-red-500">*</span>
        </label>
        <input className="input text-sm" value={form.name} onChange={set('name')}
          required placeholder="Contoh: Kas Tunai, Bank BCA, Beban Gaji" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Saldo {initial ? 'Saat Ini' : 'Awal'} (Rp)
          </label>
          <input className="input text-sm" type="number" min="0" value={form.balance}
            onChange={set('balance')} placeholder="0" inputMode="numeric" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Status</label>
          <select className="input text-sm" value={form.is_active ? 'true' : 'false'}
            onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Keterangan</label>
        <input className="input text-sm" value={form.description} onChange={set('description')}
          placeholder="Deskripsi singkat akun (opsional)" />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn-secondary text-sm" onClick={onClose}>Batal</button>
        <button type="submit" className="btn-primary text-sm" disabled={loading}>
          {loading ? 'Menyimpan...' : (initial ? 'Simpan Perubahan' : 'Tambah Akun')}
        </button>
      </div>
    </form>
  )
}

// ── Tab: Daftar Akun ──────────────────────────────────────────────────────────
function TabDaftar({ accounts, onEdit, onDelete }) {
  const [search, setSearch]           = useState('')
  const [collapsed, setCollapsed]     = useState({})

  const filtered = useMemo(() => {
    if (!search) return accounts
    const q = search.toLowerCase()
    return accounts.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q) ||
      TYPE_CONFIG[a.type]?.label.toLowerCase().includes(q)
    )
  }, [accounts, search])

  const grouped = groupAccounts(filtered)

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-10 text-sm" placeholder="Cari kode, nama, atau tipe akun..."
          value={search} onChange={e => setSearch(e.target.value)} />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
          <BookOpen size={36} className="mb-3 opacity-30" />
          <p className="font-medium">{search ? 'Akun tidak ditemukan' : 'Belum ada akun'}</p>
        </div>
      ) : (
        grouped.map(({ group, items }) => {
          const groupTotal  = items.reduce((s, a) => s + Number(a.balance), 0)
          const isCollapsed = collapsed[group]
          const groupCfg    = TYPE_CONFIG[items[0]?.type]

          return (
            <div key={group} className="card p-0 overflow-hidden">
              {/* Group header */}
              <button
                onClick={() => setCollapsed(c => ({ ...c, [group]: !c[group] }))}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {groupCfg && (
                    <div className={`w-7 h-7 rounded-lg ${groupCfg.bg} flex items-center justify-center`}>
                      <groupCfg.icon size={14} className={groupCfg.text} />
                    </div>
                  )}
                  <div className="text-left">
                    <span className="font-bold text-sm text-gray-800 dark:text-gray-100">{group}</span>
                    <span className="ml-2 text-xs text-gray-400">{items.length} akun</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-gray-800 dark:text-gray-100">{formatRupiah(groupTotal)}</span>
                  {isCollapsed ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronUp size={15} className="text-gray-400" />}
                </div>
              </button>

              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide w-24">Kode</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">Nama Akun</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide w-16 hidden sm:table-cell">Saldo N.</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide w-16 hidden sm:table-cell">Status</th>
                        <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wide w-36">Saldo</th>
                        <th className="px-4 py-2 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                      {items.map(acc => {
                        const cfg = TYPE_CONFIG[acc.type]
                        return (
                          <tr key={acc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                                {acc.code}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{acc.name}</p>
                              {acc.description && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-xs">{acc.description}</p>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center hidden sm:table-cell">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-black ${cfg?.side === 'D' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'}`}>
                                {cfg?.side || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center hidden sm:table-cell">
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${acc.is_active !== false ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                {acc.is_active !== false ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <span className={`font-black text-sm tabular-nums ${Number(acc.balance) < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'}`}>
                                {formatRupiah(acc.balance)}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => onEdit(acc)}
                                  className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600 transition-all" title="Edit">
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => onDelete(acc)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-all" title="Hapus">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    {/* Group subtotal */}
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                        <td colSpan={4} className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                          Total {group}
                        </td>
                        <td colSpan={2} className="px-3 py-2.5 text-right text-sm font-black text-gray-800 dark:text-gray-100">
                          {formatRupiah(groupTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

// ── Tab: Neraca ───────────────────────────────────────────────────────────────
function TabNeraca({ accounts }) {
  const aset      = accounts.filter(a => ['kas','bank','piutang'].includes(a.type))
  const kewajiban = accounts.filter(a => a.type === 'hutang')
  const ekuitas   = accounts.filter(a => a.type === 'modal')

  const totalAset      = aset.reduce((s, a) => s + Number(a.balance), 0)
  const totalKewajiban = kewajiban.reduce((s, a) => s + Number(a.balance), 0)
  const totalEkuitas   = ekuitas.reduce((s, a) => s + Number(a.balance), 0)

  const pendapatan = accounts.filter(a => a.type === 'pendapatan').reduce((s, a) => s + Number(a.balance), 0)
  const beban      = accounts.filter(a => a.type === 'beban').reduce((s, a) => s + Number(a.balance), 0)
  const labaBersih = pendapatan - beban

  const totalKewEkuitas = totalKewajiban + totalEkuitas + labaBersih
  const balanced        = Math.abs(totalAset - totalKewEkuitas) < 1

  function NeracaSection({ title, items, total, colorClass }) {
    return (
      <div>
        <div className={`px-4 py-2 rounded-t-xl font-bold text-sm ${colorClass}`}>{title}</div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-b-xl overflow-hidden">
          {items.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Belum ada akun</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                      <span className="font-mono text-xs text-gray-400 mr-2">{a.code}</span>
                      {a.name}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-800 dark:text-gray-100 tabular-nums">
                      {formatRupiah(a.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60">
                  <td className="px-4 py-2.5 font-bold text-sm text-gray-700 dark:text-gray-200">Total {title}</td>
                  <td className="px-4 py-2.5 text-right font-black text-gray-800 dark:text-gray-100 tabular-nums">{formatRupiah(total)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kiri: Aset */}
        <div className="space-y-4">
          <h3 className="font-bold text-base text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <div className="w-1 h-5 bg-blue-500 rounded-full" /> ASET
          </h3>
          <NeracaSection title="Aset Lancar" items={aset} total={totalAset}
            colorClass="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" />
          <div className="flex justify-between items-center bg-blue-600 text-white px-4 py-3 rounded-xl font-bold">
            <span>TOTAL ASET</span>
            <span className="tabular-nums">{formatRupiah(totalAset)}</span>
          </div>
        </div>

        {/* Kanan: Kewajiban + Ekuitas */}
        <div className="space-y-4">
          <h3 className="font-bold text-base text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <div className="w-1 h-5 bg-red-500 rounded-full" /> KEWAJIBAN & EKUITAS
          </h3>
          <NeracaSection title="Kewajiban" items={kewajiban} total={totalKewajiban}
            colorClass="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300" />
          <NeracaSection title="Ekuitas / Modal" items={ekuitas} total={totalEkuitas + labaBersih}
            colorClass="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300" />
          {labaBersih !== 0 && (
            <div className={`flex justify-between items-center px-4 py-2.5 rounded-xl text-sm font-semibold border ${labaBersih >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600'}`}>
              <span>Laba / Rugi Berjalan</span>
              <span className="font-black tabular-nums">{labaBersih >= 0 ? '+' : ''}{formatRupiah(labaBersih)}</span>
            </div>
          )}
          <div className="flex justify-between items-center bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold">
            <span>TOTAL KEW. + EKUITAS</span>
            <span className="tabular-nums">{formatRupiah(totalKewEkuitas)}</span>
          </div>
        </div>
      </div>

      {/* Persamaan akuntansi */}
      <div className={`p-4 rounded-2xl border-2 ${balanced ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20' : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Scale size={16} className={balanced ? 'text-emerald-600' : 'text-red-500'} />
          <span className={`text-sm font-bold ${balanced ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
            Persamaan Akuntansi {balanced ? '✓ Seimbang' : '✗ Tidak Seimbang'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg">
            Aset <span className="font-black ml-1">{formatRupiah(totalAset)}</span>
          </div>
          <span className="text-gray-500 font-bold text-lg">=</span>
          <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1.5 rounded-lg">
            Kewajiban <span className="font-black ml-1">{formatRupiah(totalKewajiban)}</span>
          </div>
          <span className="text-gray-500 font-bold text-lg">+</span>
          <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-lg">
            Ekuitas <span className="font-black ml-1">{formatRupiah(totalEkuitas + labaBersih)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab: Laba Rugi ────────────────────────────────────────────────────────────
function TabLabaRugi({ accounts }) {
  const pendapatanList = accounts.filter(a => a.type === 'pendapatan')
  const bebanList      = accounts.filter(a => a.type === 'beban')
  const totalPendapatan = pendapatanList.reduce((s, a) => s + Number(a.balance), 0)
  const totalBeban      = bebanList.reduce((s, a) => s + Number(a.balance), 0)
  const labaBersih      = totalPendapatan - totalBeban
  const margin          = totalPendapatan > 0 ? ((labaBersih / totalPendapatan) * 100).toFixed(1) : 0

  function LabaSection({ title, items, total, colorClass }) {
    return (
      <div>
        <div className={`px-4 py-2 rounded-t-xl font-bold text-sm ${colorClass}`}>{title}</div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-b-xl overflow-hidden">
          {items.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Belum ada akun</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map(a => {
                  const pct = total > 0 ? ((Number(a.balance) / total) * 100).toFixed(1) : 0
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                        <span className="font-mono text-xs text-gray-400 mr-2">{a.code}</span>
                        {a.name}
                        {a.description && <span className="block text-xs text-gray-400 mt-0.5">{a.description}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-semibold text-gray-800 dark:text-gray-100 tabular-nums block">{formatRupiah(a.balance)}</span>
                        <span className="text-[10px] text-gray-400">{pct}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60">
                  <td className="px-4 py-2.5 font-bold text-sm text-gray-700 dark:text-gray-200">Total {title}</td>
                  <td className="px-4 py-2.5 text-right font-black text-gray-800 dark:text-gray-100 tabular-nums">{formatRupiah(total)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <LabaSection title="Pendapatan" items={pendapatanList} total={totalPendapatan}
        colorClass="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300" />
      <LabaSection title="Beban / Pengeluaran" items={bebanList} total={totalBeban}
        colorClass="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300" />

      {/* Ringkasan laba rugi */}
      <div className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-800/60 px-4 py-2.5 font-bold text-sm text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700">
          Ringkasan Laba / Rugi
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          <div className="flex justify-between px-4 py-3 text-sm">
            <span className="text-gray-600 dark:text-gray-300">Total Pendapatan</span>
            <span className="font-bold text-green-700 dark:text-green-400 tabular-nums">{formatRupiah(totalPendapatan)}</span>
          </div>
          <div className="flex justify-between px-4 py-3 text-sm">
            <span className="text-gray-600 dark:text-gray-300">Total Beban</span>
            <span className="font-bold text-orange-600 dark:text-orange-400 tabular-nums">({formatRupiah(totalBeban)})</span>
          </div>
          <div className={`flex justify-between px-4 py-4 font-black text-base ${labaBersih >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <div>
              <span className={labaBersih >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600'}>
                {labaBersih >= 0 ? 'LABA BERSIH' : 'RUGI BERSIH'}
              </span>
              {totalPendapatan > 0 && (
                <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${labaBersih >= 0 ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-red-200 dark:bg-red-800 text-red-800'}`}>
                  {margin}% margin
                </span>
              )}
            </div>
            <span className={`tabular-nums ${labaBersih >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600'}`}>
              {labaBersih >= 0 ? '+' : ''}{formatRupiah(labaBersih)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Buku Besar (Jurnal & rekap bulanan) ───────────────────────────────────────
const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
function monthLabel(m) {
  if (!m) return ''
  const [y, mm] = m.split('-')
  return `${MONTH_NAMES[Number(mm) - 1]} ${y}`
}
function formatDate(d) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Form jurnal manual (mis. catat beban gaji, sewa, setoran modal)
function ManualJournalForm({ accounts, onSubmit, onClose }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm]   = useState({ entry_date: today, debit_account_id: '', credit_account_id: '', amount: '', description: '' })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const options = groupAccounts(accounts)

  async function submit(e) {
    e.preventDefault()
    if (!form.debit_account_id || !form.credit_account_id) return toast.error('Pilih akun debit & kredit')
    if (form.debit_account_id === form.credit_account_id)   return toast.error('Akun debit & kredit tidak boleh sama')
    if (!Number(form.amount))                               return toast.error('Nominal harus lebih dari 0')
    setSaving(true)
    try { await onSubmit({ ...form, amount: Number(form.amount) }) }
    finally { setSaving(false) }
  }

  const AccountSelect = ({ value, onChange, placeholder }) => (
    <select className="input" value={value} onChange={onChange} required>
      <option value="">{placeholder}</option>
      {options.map(g => (
        <optgroup key={g.group} label={g.group}>
          {g.items.map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
        </optgroup>
      ))}
    </select>
  )

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3 flex items-start gap-2.5">
        <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          Catat transaksi non-penjualan. Contoh beban sewa: <strong>Debit</strong> "Beban Sewa", <strong>Kredit</strong> "Kas Tunai".
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Tanggal</label>
        <input type="date" className="input" value={form.entry_date} onChange={set('entry_date')} required />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Debit (bertambah)</label>
          <AccountSelect value={form.debit_account_id} onChange={set('debit_account_id')} placeholder="Pilih akun debit" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Kredit (berkurang)</label>
          <AccountSelect value={form.credit_account_id} onChange={set('credit_account_id')} placeholder="Pilih akun kredit" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Nominal</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">Rp</span>
          <input type="number" min="1" className="input pl-9" value={form.amount} onChange={set('amount')} placeholder="0" required />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Keterangan</label>
        <input className="input" value={form.description} onChange={set('description')} placeholder="Mis. Bayar listrik Juni" />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Batal</button>
        <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
          {saving ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Menyimpan...</> : <><Plus size={15} />Simpan Jurnal</>}
        </button>
      </div>
    </form>
  )
}

// Detail entri satu akun (saldo berjalan) — muncul saat baris di-expand
function AccountDetail({ accountId, month }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    getLedgerAccount(accountId, month)
      .then(({ data }) => { if (alive) setData(data) })
      .catch(err => toast.error(err.message))
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [accountId, month])

  if (loading) return <div className="py-6 text-center text-sm text-gray-400">Memuat detail…</div>
  if (!data) return null

  return (
    <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 my-1">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2 px-1">
        <span>Saldo awal: <strong className="text-gray-700 dark:text-gray-200">{formatRupiah(data.opening)}</strong></span>
        <span>Saldo akhir: <strong className="text-gray-700 dark:text-gray-200">{formatRupiah(data.closing)}</strong></span>
      </div>
      {data.entries.length === 0 ? (
        <p className="text-center text-xs text-gray-400 py-3">Tidak ada mutasi pada bulan ini.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 dark:text-gray-500 text-left">
                <th className="py-1.5 px-2 font-medium">Tanggal</th>
                <th className="py-1.5 px-2 font-medium">Keterangan</th>
                <th className="py-1.5 px-2 font-medium text-right">Debit</th>
                <th className="py-1.5 px-2 font-medium text-right">Kredit</th>
                <th className="py-1.5 px-2 font-medium text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map(e => (
                <tr key={e.id} className="border-t border-gray-100 dark:border-gray-700/50">
                  <td className="py-1.5 px-2 whitespace-nowrap text-gray-600 dark:text-gray-300">{formatDate(e.entry_date)}</td>
                  <td className="py-1.5 px-2 text-gray-600 dark:text-gray-300">
                    {e.description || '-'}
                    {e.ref && <span className="ml-1 text-gray-400">· {e.ref}</span>}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-blue-600 dark:text-blue-400">{e.debit ? formatRupiah(e.debit) : '-'}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-green-600 dark:text-green-400">{e.credit ? formatRupiah(e.credit) : '-'}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums font-semibold text-gray-700 dark:text-gray-200">{formatRupiah(e.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TabBukuBesar({ accounts, onPosted }) {
  const [months, setMonths]     = useState([])
  const [month, setMonth]       = useState('')
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [summary, setSummary]   = useState(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [showYear, setShowYear] = useState(false)

  const year = (month || '').slice(0, 4)

  // Daftar bulan (sekali)
  useEffect(() => {
    getLedgerMonths()
      .then(({ data }) => { setMonths(data); setMonth(data[0] || '') })
      .catch(err => toast.error(err.message))
  }, [])

  const loadRecap = useCallback(() => {
    if (!month) return
    setLoading(true)
    getLedger(month)
      .then(({ data }) => setData(data))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [month])

  useEffect(() => { loadRecap() }, [loadRecap])

  // Rekap tahunan
  useEffect(() => {
    if (!year) return
    getLedgerSummary(year)
      .then(({ data }) => setSummary(data))
      .catch(() => {})
  }, [year])

  async function handleManual(payload) {
    try {
      await postManualJournal(payload)
      toast.success('Jurnal manual tersimpan')
      setManualOpen(false)
      // Pastikan bulan transaksi tampil
      const m = payload.entry_date?.slice(0, 7)
      if (m && !months.includes(m)) setMonths(ms => [m, ...ms].sort().reverse())
      if (m && m !== month) setMonth(m); else loadRecap()
      onPosted?.()
    } catch (err) { toast.error(err.message) }
  }

  if (loading && !data) return <div className="py-10 text-center text-gray-400">Memuat Buku Besar…</div>

  const balanced = data && Math.abs(data.totals.debit - data.totals.credit) < 1
  const s = data?.summary || { pendapatan: 0, beban: 0, laba: 0 }
  // hanya tampilkan akun yang punya saldo/mutasi agar ringkas
  const rows = (data?.accounts || []).filter(a => a.opening || a.debit || a.credit || a.closing)

  return (
    <div className="space-y-4">
      {/* Toolbar: pilih bulan + jurnal manual */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 sm:flex-none sm:w-56">
          <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select className="input pl-9 appearance-none" value={month} onChange={e => { setMonth(e.target.value); setExpandedId(null) }}>
            {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </div>
        <button onClick={() => setShowYear(v => !v)} className="btn-secondary flex items-center justify-center gap-2 text-sm">
          <CalendarDays size={15} /> Rekap {year}
        </button>
        <button onClick={() => setManualOpen(true)} className="btn-primary flex items-center justify-center gap-2 sm:ml-auto">
          <ArrowRightLeft size={15} /> Jurnal Manual
        </button>
      </div>

      {/* Ringkasan bulan terpilih */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Pendapatan" value={formatRupiah(s.pendapatan)} sub={monthLabel(month)} icon={TrendingUp}   gradient="bg-gradient-to-br from-emerald-500 to-green-700" />
        <StatCard label="Beban"      value={formatRupiah(s.beban)}      sub={monthLabel(month)} icon={TrendingDown} gradient="bg-gradient-to-br from-orange-500 to-amber-600" />
        <StatCard label={s.laba >= 0 ? 'Laba' : 'Rugi'} value={formatRupiah(Math.abs(s.laba))} sub={s.pendapatan > 0 ? `${((s.laba / s.pendapatan) * 100).toFixed(1)}% margin` : 'Pendapatan − Beban'} icon={s.laba >= 0 ? TrendingUp : TrendingDown} gradient={s.laba >= 0 ? 'bg-gradient-to-br from-teal-500 to-cyan-700' : 'bg-gradient-to-br from-red-600 to-rose-700'} />
        <StatCard label="Total Mutasi" value={formatRupiah(data?.totals.debit || 0)} sub={balanced ? '✓ Debit = Kredit' : '✗ Tidak seimbang'} icon={Scale} gradient="bg-gradient-to-br from-blue-500 to-indigo-700" />
      </div>

      {/* Rekap tahunan per bulan */}
      {showYear && summary && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={16} className="text-blue-500" />
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Rekap Bulanan {summary.year}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 dark:text-gray-500 text-left border-b border-gray-100 dark:border-gray-800">
                  <th className="py-2 px-2 font-medium">Bulan</th>
                  <th className="py-2 px-2 font-medium text-right">Pendapatan</th>
                  <th className="py-2 px-2 font-medium text-right">Beban</th>
                  <th className="py-2 px-2 font-medium text-right">Laba/Rugi</th>
                  <th className="py-2 px-2 font-medium text-right">Transaksi</th>
                </tr>
              </thead>
              <tbody>
                {summary.months.map(m => (
                  <tr key={m.month}
                    className={`border-b border-gray-50 dark:border-gray-800/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 ${m.month === month ? 'bg-blue-50/60 dark:bg-blue-900/10' : ''}`}
                    onClick={() => { setMonth(m.month); setExpandedId(null); setShowYear(false) }}>
                    <td className="py-2 px-2 font-medium text-gray-700 dark:text-gray-200">{monthLabel(m.month)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{m.pendapatan ? formatRupiah(m.pendapatan) : '-'}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-orange-600 dark:text-orange-400">{m.beban ? formatRupiah(m.beban) : '-'}</td>
                    <td className={`py-2 px-2 text-right tabular-nums font-semibold ${m.laba >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-500'}`}>{(m.pendapatan || m.beban) ? formatRupiah(m.laba) : '-'}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-500 dark:text-gray-400">{m.transaksi || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold text-gray-800 dark:text-gray-100 border-t-2 border-gray-200 dark:border-gray-700">
                  <td className="py-2 px-2">Total {summary.year}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{formatRupiah(summary.total.pendapatan)}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-orange-600 dark:text-orange-400">{formatRupiah(summary.total.beban)}</td>
                  <td className={`py-2 px-2 text-right tabular-nums ${summary.total.laba >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-500'}`}>{formatRupiah(summary.total.laba)}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-gray-500">{summary.total.transaksi}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tabel Buku Besar per akun */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <BookText size={16} className="text-blue-500" />
          <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Buku Besar — {monthLabel(month)}</h3>
        </div>
        {rows.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <BookText size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm">Belum ada mutasi pada {monthLabel(month)}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 dark:text-gray-500 text-left bg-gray-50 dark:bg-gray-800/40">
                  <th className="py-2.5 px-3 font-medium w-6"></th>
                  <th className="py-2.5 px-2 font-medium">Akun</th>
                  <th className="py-2.5 px-2 font-medium text-right">Saldo Awal</th>
                  <th className="py-2.5 px-2 font-medium text-right">Debit</th>
                  <th className="py-2.5 px-2 font-medium text-right">Kredit</th>
                  <th className="py-2.5 px-2 font-medium text-right">Saldo Akhir</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(a => {
                  const cfg = TYPE_CONFIG[a.type]
                  const open = expandedId === a.id
                  return (
                    <Fragment key={a.id}>
                      <tr className="border-t border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40"
                        onClick={() => setExpandedId(open ? null : a.id)}>
                        <td className="py-2.5 px-3 text-gray-400">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg?.bg} ${cfg?.text}`}>{a.code}</span>
                            <span className="font-medium text-gray-700 dark:text-gray-200">{a.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-gray-500 dark:text-gray-400">{formatRupiah(a.opening)}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-blue-600 dark:text-blue-400">{a.debit ? formatRupiah(a.debit) : '-'}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-green-600 dark:text-green-400">{a.credit ? formatRupiah(a.credit) : '-'}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-gray-800 dark:text-gray-100">{formatRupiah(a.closing)}</td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={6} className="px-3 pb-2">
                            <AccountDetail accountId={a.id} month={month} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-800/40 font-bold text-gray-800 dark:text-gray-100 border-t-2 border-gray-200 dark:border-gray-700">
                  <td></td>
                  <td className="py-2.5 px-2">Total Mutasi</td>
                  <td></td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-blue-600 dark:text-blue-400">{formatRupiah(data?.totals.debit || 0)}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-green-600 dark:text-green-400">{formatRupiah(data?.totals.credit || 0)}</td>
                  <td className="py-2.5 px-2 text-right">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${balanced ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                      {balanced ? '✓ Seimbang' : '✗ Selisih'}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={manualOpen} onClose={() => setManualOpen(false)} title="Jurnal Manual" size="md">
        <ManualJournalForm accounts={accounts} onSubmit={handleManual} onClose={() => setManualOpen(false)} />
      </Modal>
    </div>
  )
}

// ── Halaman Utama ─────────────────────────────────────────────────────────────
export default function Accounts() {
  const [accounts, setAccounts]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [modalOpen, setModalOpen]       = useState(false)
  const [editTarget, setEditTarget]     = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [tab, setTab]                   = useState('bukubesar') // 'bukubesar' | 'daftar' | 'neraca' | 'labarugi'

  const fetchAccounts = useCallback(async () => {
    try {
      const { data } = await getAccounts()
      setAccounts(data)
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  async function handleCreate(values) {
    try {
      await createAccount(values)
      toast.success('Akun berhasil ditambahkan')
      setModalOpen(false)
      fetchAccounts()
    } catch (err) { toast.error(err.message) }
  }

  async function handleUpdate(values) {
    try {
      await updateAccount(editTarget.id, values)
      toast.success('Akun berhasil diperbarui')
      setEditTarget(null)
      fetchAccounts()
    } catch (err) { toast.error(err.message) }
  }

  async function handleDelete() {
    try {
      await deleteAccount(deleteTarget.id)
      toast.success('Akun berhasil dihapus')
      fetchAccounts()
    } catch (err) { toast.error(err.message) }
  }

  const totalAset       = accounts.filter(a => ['kas','bank','piutang'].includes(a.type)).reduce((s, a) => s + Number(a.balance), 0)
  const totalKewajiban  = accounts.filter(a => a.type === 'hutang').reduce((s, a) => s + Number(a.balance), 0)
  const totalModal      = accounts.filter(a => a.type === 'modal').reduce((s, a) => s + Number(a.balance), 0)
  const totalPendapatan = accounts.filter(a => a.type === 'pendapatan').reduce((s, a) => s + Number(a.balance), 0)
  const totalBeban      = accounts.filter(a => a.type === 'beban').reduce((s, a) => s + Number(a.balance), 0)
  const labaBersih      = totalPendapatan - totalBeban
  const modalBersih     = totalAset - totalKewajiban

  if (loading) return <FullPageSpinner />

  const TABS = [
    { key: 'bukubesar', label: 'Buku Besar',  icon: BookText },
    { key: 'daftar',    label: 'Daftar Akun', icon: BookOpen },
    { key: 'neraca',    label: 'Neraca',      icon: Scale },
    { key: 'labarugi',  label: 'Laba Rugi',   icon: TrendingUp },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100">Buku Besar</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{accounts.length} akun · Chart of Accounts</p>
        </div>
        <button className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
          onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Tambah Akun
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Total Aset"      value={formatRupiah(totalAset)}       sub="Kas + Bank + Piutang"  icon={Wallet}       gradient="bg-gradient-to-br from-blue-500 to-blue-700" />
        <StatCard label="Kewajiban"       value={formatRupiah(totalKewajiban)}  sub="Hutang"                icon={TrendingDown} gradient="bg-gradient-to-br from-red-500 to-rose-600" />
        <StatCard label="Modal Bersih"    value={formatRupiah(modalBersih)}     sub="Aset − Kewajiban"      icon={Users}        gradient="bg-gradient-to-br from-violet-500 to-purple-700" />
        <StatCard label="Pendapatan"      value={formatRupiah(totalPendapatan)} sub="Total pemasukan"       icon={TrendingUp}   gradient="bg-gradient-to-br from-emerald-500 to-green-700" />
        <StatCard label="Beban"           value={formatRupiah(totalBeban)}      sub="Total pengeluaran"     icon={ReceiptText}  gradient="bg-gradient-to-br from-orange-500 to-amber-600" />
        <StatCard
          label={labaBersih >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}
          value={formatRupiah(Math.abs(labaBersih))}
          sub={totalPendapatan > 0 ? `${((labaBersih / totalPendapatan) * 100).toFixed(1)}% margin` : 'Pendapatan − Beban'}
          icon={labaBersih >= 0 ? TrendingUp : TrendingDown}
          gradient={labaBersih >= 0 ? 'bg-gradient-to-br from-teal-500 to-cyan-700' : 'bg-gradient-to-br from-red-600 to-rose-700'}
        />
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-full sm:w-auto sm:inline-flex">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all
              ${tab === key
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'bukubesar' && <TabBukuBesar accounts={accounts} onPosted={fetchAccounts} />}
      {tab === 'daftar'    && <TabDaftar    accounts={accounts} onEdit={setEditTarget} onDelete={setDeleteTarget} />}
      {tab === 'neraca'    && <TabNeraca    accounts={accounts} />}
      {tab === 'labarugi'  && <TabLabaRugi  accounts={accounts} />}

      {/* Modals */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Akun Baru" size="md">
        <AccountForm onSubmit={handleCreate} onClose={() => setModalOpen(false)} />
      </Modal>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Akun" size="md">
        {editTarget && <AccountForm initial={editTarget} onSubmit={handleUpdate} onClose={() => setEditTarget(null)} />}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Hapus Akun"
        message={`Yakin ingin menghapus akun "${deleteTarget?.name}" (${deleteTarget?.code})?`}
        confirmLabel="Hapus Akun"
      />
    </div>
  )
}
