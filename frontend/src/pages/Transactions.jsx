import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Eye, Trash2, Printer } from 'lucide-react'
import { getTransactions, getTransaction, deleteTransaction, getSettings } from '../api'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import { FullPageSpinner } from '../components/ui/Spinner'
import { printReceipt } from '../utils/printReceipt'

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

const paymentLabel = { cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer', card: 'Kartu' }

function ReceiptContent({ tx, settings = {} }) {
  if (!tx) return null
  return (
    <div className="text-sm space-y-3">
      <div className="text-center border-b border-dashed border-gray-300 pb-3">
        <p className="font-bold text-base">{settings.store_name || 'KASIR ONLINE'}</p>
        {settings.store_tagline && <p className="text-gray-400 text-xs">{settings.store_tagline}</p>}
        {settings.store_address && <p className="text-gray-500 text-xs">{settings.store_address}</p>}
        {settings.store_phone   && <p className="text-gray-500 text-xs">Telp: {settings.store_phone}</p>}
        <p className="text-gray-500 text-xs">Struk Pembelian</p>
        <p className="font-mono font-bold mt-1">{tx.invoice_number}</p>
        <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleString('id-ID')}</p>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-dashed border-gray-300">
            <th className="text-left py-1 text-gray-600">Item</th>
            <th className="text-center py-1 text-gray-600">Qty</th>
            <th className="text-right py-1 text-gray-600">Harga</th>
            <th className="text-right py-1 text-gray-600">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {tx.items?.map((item, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-1.5">{item.product_name}</td>
              <td className="text-center py-1.5">{item.quantity}</td>
              <td className="text-right py-1.5">{formatRupiah(item.price)}</td>
              <td className="text-right py-1.5 font-medium">{formatRupiah(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-dashed border-gray-300 pt-2 space-y-1">
        <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>{formatRupiah(tx.subtotal)}</span></div>
        {tx.discount > 0 && <div className="flex justify-between text-xs text-green-600"><span>Diskon</span><span>- {formatRupiah(tx.discount)}</span></div>}
        {tx.tax > 0    && <div className="flex justify-between text-xs text-gray-500"><span>Pajak</span><span>{formatRupiah(tx.tax)}</span></div>}
        <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-300"><span>Total</span><span>{formatRupiah(tx.grand_total)}</span></div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Bayar ({paymentLabel[tx.payment_method] || tx.payment_method})</span>
          <span>{formatRupiah(tx.amount_paid)}</span>
        </div>
        <div className="flex justify-between text-xs font-medium"><span>Kembalian</span><span>{formatRupiah(tx.change_amount)}</span></div>
      </div>
      <p className="text-center text-xs text-gray-400 border-t border-dashed border-gray-300 pt-3">
        Terima kasih telah berbelanja!
      </p>
    </div>
  )
}

export default function Transactions() {
  const { isAdmin } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [settings, setSettings]         = useState({})
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [from, setFrom]                 = useState('')
  const [to, setTo]                     = useState('')
  const [detail, setDetail]             = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getTransactions({ from, to, limit: 100 })
      setTransactions(data.data)
      setTotal(data.total)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])
  useEffect(() => { getSettings().then(r => setSettings(r.data)).catch(() => {}) }, [])

  async function openDetail(id) {
    setDetailLoading(true)
    setDetail({ loading: true })
    try {
      const { data } = await getTransaction(id)
      setDetail(data)
    } catch (err) {
      toast.error(err.message)
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  async function openAndPrint(id) {
    try {
      const { data } = await getTransaction(id)
      printReceipt(data, settings)
    } catch (err) { toast.error(err.message) }
  }

  async function handleDelete() {
    try {
      await deleteTransaction(deleteTarget.id)
      toast.success('Transaksi dibatalkan, stok dikembalikan')
      fetchTransactions()
    } catch (err) { toast.error(err.message) }
  }

  if (loading) return <FullPageSpinner />

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 md:mb-6">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-800">Riwayat Transaksi</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} transaksi ditemukan</p>
        </div>
      </div>

      {/* Filter tanggal — stack di mobile */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4 sm:items-end">
        <div className="flex-1 sm:flex-none">
          <label className="block text-xs text-gray-500 mb-1">Dari Tanggal</label>
          <input type="date" className="input text-sm w-full sm:w-40" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="flex-1 sm:flex-none">
          <label className="block text-xs text-gray-500 mb-1">Sampai Tanggal</label>
          <input type="date" className="input text-sm w-full sm:w-40" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        {(from || to) && (
          <button className="btn-secondary text-sm" onClick={() => { setFrom(''); setTo('') }}>Reset</button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        {transactions.length === 0 ? (
          <EmptyState title="Belum ada transaksi" description="Transaksi muncul setelah checkout di kasir" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[380px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 md:px-6 py-3 text-gray-600 font-medium">No. Faktur</th>
                  <th className="text-left px-4 md:px-6 py-3 text-gray-600 font-medium hidden sm:table-cell">Waktu</th>
                  <th className="text-center px-4 md:px-6 py-3 text-gray-600 font-medium hidden md:table-cell">Pembayaran</th>
                  <th className="text-right px-4 md:px-6 py-3 text-gray-600 font-medium">Total</th>
                  <th className="px-4 md:px-6 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 md:px-6 py-3">
                      <p className="font-mono font-medium text-gray-800 text-xs md:text-sm">{tx.invoice_number}</p>
                      {/* Waktu tampil di sini pada mobile */}
                      <p className="text-xs text-gray-400 sm:hidden mt-0.5">
                        {new Date(tx.created_at).toLocaleString('id-ID', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}
                      </p>
                    </td>
                    <td className="px-4 md:px-6 py-3 text-gray-500 text-xs md:text-sm hidden sm:table-cell whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 md:px-6 py-3 text-center hidden md:table-cell">
                      <Badge color={
                        tx.payment_method === 'cash' ? 'green' :
                        tx.payment_method === 'qris' ? 'yellow' :
                        tx.payment_method === 'transfer' ? 'blue' : 'purple'
                      }>
                        {paymentLabel[tx.payment_method] || tx.payment_method}
                      </Badge>
                    </td>
                    <td className="px-4 md:px-6 py-3 text-right font-semibold text-gray-800 whitespace-nowrap text-xs md:text-sm">
                      {formatRupiah(tx.grand_total)}
                    </td>
                    <td className="px-4 md:px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" onClick={() => openDetail(tx.id)} title="Detail"><Eye size={14}/></button>
                        <button className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" onClick={() => openAndPrint(tx.id)} title="Cetak"><Printer size={14}/></button>
                        {isAdmin && (
                          <button className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" onClick={() => setDeleteTarget(tx)} title="Batalkan"><Trash2 size={14}/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Detail Transaksi" size="md">
        {detailLoading || detail?.loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600" /></div>
        ) : (
          <>
            <ReceiptContent tx={detail} settings={settings} />
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
              <button className="btn-secondary flex items-center gap-2" onClick={() => printReceipt(detail, settings)}>
                <Printer size={16} /> Cetak Struk
              </button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Batalkan Transaksi"
        message={`Yakin ingin membatalkan ${deleteTarget?.invoice_number}? Stok akan dikembalikan.`}
        confirmLabel="Batalkan Transaksi"
      />
    </div>
  )
}
