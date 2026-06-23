import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Receipt, Search, RefreshCw, AlertTriangle, CheckCircle, Eye, X } from 'lucide-react';

export default function TransactionHistory() {
  const { token } = useAuthStore();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // State Detail Modal
  const [selectedTx, setSelectedTx] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [processLoading, setProcessLoading] = useState(false);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(res.data.data);
    } catch (error) {
      console.error('Gagal memuat riwayat transaksi:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [token]);

  // === FUNGSI EKSEKUSI RETUR STOK ===
  const handleReturnClick = async (txId) => {
    const konfirmasi = window.confirm(
      'PERINGATAN KRUSIAL!\n\nApakah Anda yakin ingin me-retur transaksi ini? Status keuangan akan dibatalkan dan seluruh stok barang fisik akan dikembalikan otomatis ke gudang logistik.'
    );
    
    if (!konfirmasi) return;

    try {
      setProcessLoading(true);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/transactions/${txId}/return`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(res.data.message || 'Sukses! Transaksi dibatalkan & stok pulih.');
      setDetailModalOpen(false);
      fetchTransactions(); // Refresh data tabel
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal memproses retur barang');
    } finally {
      setProcessLoading(false);
    }
  };

  const filteredTx = transactions.filter(tx => 
    tx.tx_code.toLowerCase().includes(search.toLowerCase()) ||
    (tx.patient_name && tx.patient_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 md:p-10 font-inter bg-[#F8F9FA] min-h-full">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-poppins font-bold text-neutral-800 flex items-center gap-3 tracking-tight">
            <div className="p-2.5 bg-[#FFF3F7] rounded-xl shadow-sm">
              <Receipt className="w-7 h-7 text-[#D63384]" />
            </div>
            Riwayat Transaksi & Return Stock
          </h1>
          <p className="text-neutral-500 mt-2 text-sm font-medium ml-14">
            Audit nota penjualan kasir dan lakukan pembatalan atau retur barang pelanggan demi akurasi stok gudang.
          </p>
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 mb-6">
          <div className="relative w-full md:w-1/3">
            <Search className="w-5 h-5 absolute left-4 top-3.5 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Cari Kode Nota atau Nama Pasien..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-neutral-200 pl-12 pr-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] transition-all font-medium"
            />
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-neutral-200 text-neutral-600 font-poppins text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold">Kode Nota</th>
                  <th className="p-4 font-semibold">Tanggal & Waktu</th>
                  <th className="p-4 font-semibold">Pasien / Pelanggan</th>
                  <th className="p-4 font-semibold text-right">Total Belanja</th>
                  <th className="p-4 font-semibold text-center">Status</th>
                  <th className="p-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr><td colSpan="6" className="p-10 text-center text-neutral-500 font-medium">Memuat history transaksi kasir...</td></tr>
                ) : filteredTx.length === 0 ? (
                  <tr><td colSpan="6" className="p-10 text-center text-neutral-400 font-medium">Tidak ada data transaksi ditemukan.</td></tr>
                ) : (
                  filteredTx.map((tx) => (
                    <tr key={tx.id} className={`hover:bg-neutral-50/50 transition-colors ${tx.status === 'returned' ? 'bg-rose-50/20' : ''}`}>
                      <td className="p-4 font-mono font-bold text-sm text-neutral-700">{tx.tx_code}</td>
                      <td className="p-4 text-xs font-medium text-neutral-500">
                        {new Date(tx.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="p-4 font-poppins font-bold text-sm text-neutral-800">
                        {tx.patient_name || 'Pasien Umum'}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-[#D63384]">
                        Rp {Number(tx.total).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          tx.status === 'returned' 
                          ? 'bg-rose-50 text-rose-600 border-rose-100' 
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                          {tx.status === 'returned' ? '↩️ Diretur' : '✅ Sukses'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => { setSelectedTx(tx); setDetailModalOpen(true); }}
                          className="inline-flex items-center gap-1.5 bg-neutral-100 hover:bg-[#FFF3F7] text-neutral-600 hover:text-[#D63384] px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Detail Nota
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* =========================================================
          MODAL: DETAIL NOTA & TOMBOL RETURN (PREMIUM UX)
          ========================================================= */}
      {detailModalOpen && selectedTx && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-100 w-full max-w-md rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            
            <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-[#F8F9FA]">
              <div>
                <h2 className="text-base font-poppins font-bold text-neutral-800">Detail Nota Penjualan</h2>
                <p className="text-xs font-mono text-neutral-400 mt-0.5">{selectedTx.tx_code}</p>
              </div>
              <button onClick={() => setDetailModalOpen(false)} className="text-neutral-400 hover:text-neutral-700 bg-white p-2 rounded-full shadow-sm border border-neutral-200 transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-6 space-y-4">
              {/* Ringkasan Status */}
              <div className="flex justify-between items-center text-sm border-b border-neutral-100 pb-3">
                <span className="text-neutral-500 font-medium">Nama Pasien:</span>
                <span className="text-neutral-800 font-bold">{selectedTx.patient_name || 'Pasien Umum'}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-neutral-100 pb-3">
                <span className="text-neutral-500 font-medium">Metode Bayar:</span>
                <span className="text-neutral-800 font-semibold capitalize font-mono text-xs">{selectedTx.payment_method}</span>
              </div>

              {/* DAFTAR BARANG YANG DIBELI */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Item Belanjaan:</label>
                <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-neutral-200 space-y-2 max-h-40 overflow-y-auto">
                  {selectedTx.items?.map((item, index) => (
                    <div key={index} className="flex justify-between text-xs text-neutral-700 font-medium">
                      <span>{item.name} ({item.qty}x)</span>
                      <span className="font-mono">Rp {Number(item.sell_price * item.qty).toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-end bg-[#FFF3F7] p-4 rounded-2xl border border-[#F8B3CF]/30 mt-4">
                <span className="text-sm font-semibold text-neutral-600 font-poppins">Total Dana Penjualan:</span>
                <span className="text-2xl font-mono font-bold text-[#D63384]">Rp {Number(selectedTx.total).toLocaleString('id-ID')}</span>
              </div>

              {/* TOMBOL AKSI RETUR */}
              <div className="pt-4">
                {selectedTx.status === 'returned' ? (
                  <div className="bg-rose-50 text-rose-600 border border-rose-100 p-4 rounded-xl text-xs font-medium text-center flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Transaksi ini telah dibatalkan & stok sudah dikembalikan.
                  </div>
                ) : (
                  <button
                    onClick={() => handleReturnClick(selectedTx.id)}
                    disabled={processLoading}
                    className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-rose-600 hover:to-red-700 text-white py-3.5 rounded-xl font-poppins font-bold text-sm shadow-[0_4px_12px_rgba(225,29,72,0.2)] hover:shadow-[0_6px_15px_rgba(225,29,72,0.35)] transition-all cursor-pointer flex justify-center items-center gap-2"
                  >
                    {processLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <><RefreshCw className="w-4 h-4" /> Batalkan Transaksi & Return Stock</>
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}