import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Receipt, Search, CheckCircle, Wallet, User, Calendar, X, CreditCard } from 'lucide-react';

export default function Receivables() {
  const { token } = useAuthStore();
  const [receivables, setReceivables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // State untuk Modal Pembayaran
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [processLoading, setProcessLoading] = useState(false);

  const fetchReceivables = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/receivables`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReceivables(res.data.data);
    } catch (error) {
      console.error('Gagal mengambil data piutang', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivables();
  }, [token]);

  const openPaymentModal = (item) => {
    setSelectedItem(item);
    setPayAmount(item.sisa_piutang); // Default diisi dengan pelunasan penuh
    setModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) return alert('Nominal pembayaran tidak valid!');
    if (Number(payAmount) > selectedItem.sisa_piutang) return alert('Nominal melebihi sisa hutang pasien!');

    setProcessLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/receivables/${selectedItem.id}/collect`, 
        { amount_paid: Number(payAmount) }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert(res.data.message);
      setModalOpen(false);
      setSelectedItem(null);
      setPayAmount('');
      fetchReceivables(); // Refresh data, jika lunas otomatis hilang dari tabel
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal memproses pembayaran');
    } finally {
      setProcessLoading(false);
    }
  };

  const filteredReceivables = receivables.filter(r => 
    (r.patient_name?.toLowerCase() || 'pasien umum').includes(search.toLowerCase()) || 
    r.tx_code?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUangNyangkut = receivables.reduce((sum, item) => sum + Number(item.sisa_piutang), 0);

  return (
    <div className="p-6 md:p-10 font-inter bg-[#F8F9FA] min-h-full">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-poppins font-bold text-neutral-800 flex items-center gap-3 tracking-tight">
              <div className="p-2.5 bg-[#FFF3F7] rounded-xl shadow-sm">
                <Receipt className="w-7 h-7 text-[#D63384]" />
              </div>
              Piutang Pasien
            </h1>
            <p className="text-neutral-500 mt-2 text-sm font-medium ml-14">Kelola dan terima pembayaran tagihan pasien yang tertunda.</p>
          </div>
          
          <div className="bg-white border border-neutral-200 px-6 py-3 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-[#FFF3F7] text-[#D63384] rounded-full flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-poppins font-semibold text-neutral-500 mb-0.5">Total Uang di Pasien</p>
              <h2 className="text-2xl font-poppins font-bold text-neutral-800 tracking-tight">Rp {totalUangNyangkut.toLocaleString('id-ID')}</h2>
            </div>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 mb-6 flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-3.5 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Cari berdasarkan Nama Pasien atau Kode Transaksi..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-neutral-200 pl-12 pr-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 focus:ring-[#D63384]/20 transition-all font-medium"
            />
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-neutral-200 text-neutral-600 font-poppins text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">Info Pasien & Transaksi</th>
                  <th className="p-4 font-semibold">Total Tagihan Awal</th>
                  <th className="p-4 font-semibold">Sudah Dibayar</th>
                  <th className="p-4 font-semibold">Sisa Piutang (Kurang)</th>
                  <th className="p-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-10 text-center text-neutral-500 font-medium">Memuat data piutang pasien...</td>
                  </tr>
                ) : filteredReceivables.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-10 text-center text-emerald-600 font-semibold flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5" /> Bersih! Tidak ada pasien yang menunggak tagihan saat ini.
                    </td>
                  </tr>
                ) : (
                  filteredReceivables.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-poppins font-bold text-neutral-800 text-sm mb-1 flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-neutral-400" /> {item.patient_name || 'Pasien Umum'}
                          </span>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded font-mono font-semibold border border-neutral-200">
                              {item.tx_code}
                            </span>
                            <span className="text-neutral-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {new Date(item.created_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-neutral-500 font-semibold">Rp {Number(item.total).toLocaleString('id-ID')}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-md">Rp {Number(item.paid_amount).toLocaleString('id-ID')}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-rose-600 font-poppins font-bold text-lg tracking-tight">Rp {Number(item.sisa_piutang).toLocaleString('id-ID')}</span>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => openPaymentModal(item)}
                          className="bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white px-4 py-2 rounded-xl font-poppins font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full"
                        >
                          <CreditCard className="w-4 h-4" /> Terima Dana
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
          MODAL: PROSES PEMBAYARAN PIUTANG
          ========================================================= */}
      {modalOpen && selectedItem && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-100 w-full max-w-md p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-neutral-100 pb-4">
              <h2 className="text-xl font-poppins font-bold text-neutral-800 flex items-center gap-2">
                <Receipt className="w-6 h-6 text-[#EC6BA5]" /> Pembayaran Piutang
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-neutral-400 hover:text-neutral-700 bg-neutral-50 hover:bg-neutral-100 p-2 rounded-full transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="bg-[#F8F9FA] border border-neutral-200 rounded-2xl p-5 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-neutral-500 text-sm font-medium">Pasien</span>
                <span className="font-poppins font-bold text-neutral-800">{selectedItem.patient_name || 'Umum'}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-neutral-500 text-sm font-medium">No. Transaksi</span>
                <span className="font-mono text-xs font-bold text-neutral-600 bg-white px-2 py-0.5 rounded border border-neutral-200">{selectedItem.tx_code}</span>
              </div>
              <div className="w-full h-px bg-neutral-200 my-3"></div>
              <div className="flex justify-between items-end">
                <span className="text-neutral-500 text-sm font-medium">Sisa Tagihan</span>
                <span className="font-poppins font-bold text-rose-600 text-2xl tracking-tight">Rp {Number(selectedItem.sisa_piutang).toLocaleString('id-ID')}</span>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit}>
              <div className="mb-8">
                <label className="block text-sm font-semibold text-neutral-600 mb-2 font-poppins">Uang Diterima Hari Ini (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-[#D63384] font-bold">Rp</span>
                  <input 
                    type="number" 
                    required 
                    max={selectedItem.sisa_piutang}
                    value={payAmount} 
                    onChange={e => setPayAmount(e.target.value)} 
                    className="w-full bg-[#FFF3F7] border border-[#F8B3CF] pl-12 pr-4 py-3.5 rounded-xl text-[#D63384] font-bold text-xl focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-mono" 
                    placeholder="0" 
                  />
                </div>
                {Number(payAmount) === Number(selectedItem.sisa_piutang) && (
                  <p className="text-emerald-600 text-xs font-bold mt-2 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5"/> Pembayaran ini akan melunasi tagihan.</p>
                )}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="w-1/3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 py-3.5 rounded-xl font-poppins font-semibold transition-all cursor-pointer">
                  Batal
                </button>
                <button type="submit" disabled={processLoading} className="w-2/3 bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white py-3.5 rounded-xl font-poppins font-bold shadow-[0_4px_15px_rgba(214,51,132,0.25)] hover:shadow-[0_6px_20px_rgba(214,51,132,0.4)] transition-all cursor-pointer disabled:opacity-50 flex justify-center items-center gap-2">
                  {processLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Proses Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}