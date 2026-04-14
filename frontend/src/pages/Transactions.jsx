import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Eye, Trash2, Printer } from 'lucide-react'
import { getTransactions, getTransaction, deleteTransaction } from '../api'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import { FullPageSpinner } from '../components/ui/Spinner'
import { printReceipt } from '../utils/printReceipt'

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

const paymentLabel = { cash: 'Tunai', transfer: 'Transfer', card: 'Kartu' }

function ReceiptContent({ tx }) {
  if (!tx) return null
  return (
    <div className="text-sm space-y-3">
      <div className="text-center border-b border-dashed border-gray-300 pb-3">
        <p className="font-bold text-base">KASIR ONLINE</p>
        <p className="text-gray-500 text-xs">Struk Pembelian</p>
        <p className="font-mono font-bold mt-1">{tx.invoice_number}</p>
        <p className="text-xs text-gray-400">
          {new Date(tx.created_at).toLocaleString('id-ID')}
        </p>
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
        <div className="flex justify-between text-xs text-gray-500">
          <span>Subtotal</span><span>{formatRupiah(tx.subtotal)}</span>
        </div>
        {tx.discount > 0 && (
          <div className="flex justify-between text-xs text-green-600">
            <span>Diskon</span><span>- {formatRupiah(tx.discount)}</span>
          </div>
        )}
        {tx.tax > 0 && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>Pajak</span><span>{formatRupiah(tx.tax)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-300">
          <span>Total</span><span>{formatRupiah(tx.grand_total)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Bayar ({paymentLabel[tx.payment_method] || tx.payment_method})</span>
          <span>{formatRupiah(tx.amount_paid)}</span>
        </div>
        <div className="flex justify-between text-xs font-medium">
          <span>Kembalian</span><span>{formatRupiah(tx.change_amount)}</span>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 border-t border-dashed border-gray-300 pt-3">
        Terima kasih telah berbelanja!
      </p>
    </div>
  )
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
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
      printReceipt(data)
    } catch (err) {
      toast.error(err.message)
    }
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Riwayat Transaksi</h2>
          <p className="text-sm text-gray-500 mt-1">{total} transaksi ditemukan</p>
        </div>
      </div>

      {/* Filter tanggal */}
      <div className="flex gap-3 mb-4 items-center">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Dari Tanggal</label>
          <input type="date" className="input w-40" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Sampai Tanggal</label>
          <input type="date" className="input w-40" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        {(from || to) && (
          <button className="btn-secondary mt-4" onClick={() => { setFrom(''); setTo('') }}>Reset</button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        {transactions.length === 0 ? (
          <EmptyState title="Belum ada transaksi" description="Transaksi akan muncul setelah Anda melakukan checkout di kasir" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-600 font-medium">No. Faktur</th>
                  <th className="text-left px-6 py-3 text-gray-600 font-medium">Waktu</th>
                  <th className="text-center px-6 py-3 text-gray-600 font-medium">Pembayaran</th>
                  <th className="text-right px-6 py-3 text-gray-600 font-medium">Total</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-gray-800">{tx.invoice_number}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(tx.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge color={tx.payment_method === 'cash' ? 'green' : tx.payment_method === 'transfer' ? 'blue' : 'purple'}>
                        {paymentLabel[tx.payment_method] || tx.payment_method}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-800">{formatRupiah(tx.grand_total)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                          onClick={() => openDetail(tx.id)}
                          title="Lihat Detail"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                          onClick={() => openAndPrint(tx.id)}
                          title="Cetak Struk"
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                          onClick={() => setDeleteTarget(tx)}
                          title="Batalkan Transaksi"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail / Struk */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Detail Transaksi" size="md">
        {detailLoading || detail?.loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600" /></div>
        ) : (
          <>
            <div className="receipt-print-area">
              <ReceiptContent tx={detail} />
            </div>
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
              <button
                className="btn-secondary flex items-center gap-2"
                onClick={() => printReceipt(detail)}
              >
                <Printer size={16} /> Cetak Struk
              </button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Batalkan Transaksi"
        message={`Yakin ingin membatalkan transaksi ${deleteTarget?.invoice_number}? Stok produk akan dikembalikan.`}
        confirmLabel="Batalkan Transaksi"
      />
    </div>
  )
}
