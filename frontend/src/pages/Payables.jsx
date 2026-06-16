import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { CreditCard, Plus, CheckCircle, Clock, Trash2, X, AlertCircle } from 'lucide-react';

export default function Payables() {
  const { token } = useAuthStore();
  const [payables, setPayables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [processLoading, setProcessLoading] = useState(false);

  const [formData, setFormData] = useState({
    supplier_name: '',
    invoice_number: '',
    amount: '',
    due_date: '',
    notes: ''
  });

  const fetchPayables = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/payables`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayables(res.data.data);
    } catch (error) {
      console.error('Gagal mengambil data hutang', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayables();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/payables`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setModalOpen(false);
      setFormData({ supplier_name: '', invoice_number: '', amount: '', due_date: '', notes: '' });
      fetchPayables();
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal menyimpan data hutang');
    } finally {
      setProcessLoading(false);
    }
  };

  const handleUpdateStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'pending' ? 'paid' : 'pending';
    const confirmMessage = newStatus === 'paid' 
      ? 'Tandai faktur ini sebagai LUNAS?' 
      : 'Batalkan status lunas dan ubah kembali menjadi BELUM LUNAS?';
      
    if (window.confirm(confirmMessage)) {
      try {
        await axios.put(`${import.meta.env.VITE_API_URL}/payables/${id}/status`, { status: newStatus }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchPayables();
      } catch (error) {
        alert('Gagal memperbarui status');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus catatan hutang ini secara permanen?')) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL}/payables/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchPayables();
      } catch (error) {
        alert('Gagal menghapus data');
      }
    }
  };

  // Kalkulasi Ringkasan Hutang
  const totalHutang = payables.filter(p => p.status === 'pending').reduce((sum, item) => sum + Number(item.amount), 0);
  const totalFakturPending = payables.filter(p => p.status === 'pending').length;

  return (
    <div className="p-6 md:p-10 font-inter bg-[#F8F9FA] min-h-full">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-poppins font-bold text-neutral-800 flex items-center gap-3 tracking-tight">
              <div className="p-2.5 bg-[#FFF3F7] rounded-xl shadow-sm">
                <CreditCard className="w-7 h-7 text-[#D63384]" />
              </div>
              Hutang Klinik (Payables)
            </h1>
            <p className="text-neutral-500 mt-2 text-sm font-medium ml-14">Pantau tagihan faktur dari PBF / Supplier yang belum dibayar.</p>
          </div>
          
          <button 
            onClick={() => setModalOpen(true)}
            className="bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white px-5 py-3 rounded-xl font-poppins font-semibold flex items-center gap-2 transition-all shadow-[0_4px_12px_rgba(214,51,132,0.25)] hover:shadow-[0_6px_15px_rgba(214,51,132,0.4)] cursor-pointer"
          >
            <Plus className="w-5 h-5" /> Catat Faktur Baru
          </button>
        </div>

        {/* WIDGET RINGKASAN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-poppins font-semibold text-neutral-500 mb-1">Total Hutang Berjalan</p>
              <h2 className="text-3xl font-poppins font-bold text-neutral-800 tracking-tight">Rp {totalHutang.toLocaleString('id-ID')}</h2>
            </div>
          </div>
          <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-poppins font-semibold text-neutral-500 mb-1">Faktur Belum Lunas</p>
              <h2 className="text-3xl font-poppins font-bold text-neutral-800 tracking-tight">{totalFakturPending} <span className="text-lg font-medium text-neutral-400">Faktur</span></h2>
            </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-neutral-200 text-neutral-600 font-poppins text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">PBF / Supplier</th>
                  <th className="p-4 font-semibold">Nominal Tagihan</th>
                  <th className="p-4 font-semibold">Jatuh Tempo</th>
                  <th className="p-4 font-semibold text-center">Status</th>
                  <th className="p-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-10 text-center text-neutral-500 font-medium">Memuat data hutang...</td>
                  </tr>
                ) : payables.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-10 text-center text-neutral-500 font-medium">Tidak ada catatan hutang klinik. Bagus!</td>
                  </tr>
                ) : (
                  payables.map((item) => {
                    // Logic Jatuh Tempo
                    const today = new Date();
                    const dueDate = new Date(item.due_date);
                    const diffTime = dueDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    let dateColor = "text-neutral-600";
                    let dateBg = "bg-neutral-100";
                    
                    if (item.status === 'pending') {
                      if (diffDays < 0) {
                        dateColor = "text-rose-600";
                        dateBg = "bg-rose-100 border border-rose-200";
                      } else if (diffDays <= 3) {
                        dateColor = "text-amber-600";
                        dateBg = "bg-amber-100 border border-amber-200";
                      }
                    }

                    return (
                      <tr key={item.id} className={`hover:bg-neutral-50 transition-colors ${item.status === 'paid' ? 'opacity-60 bg-neutral-50/50' : ''}`}>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className={`font-poppins font-bold text-sm mb-1 ${item.status === 'paid' ? 'text-neutral-500 line-through' : 'text-neutral-800'}`}>{item.supplier_name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded font-mono font-semibold border border-neutral-200">INV: {item.invoice_number || '-'}</span>
                            </div>
                            {item.notes && <p className="text-[11px] text-neutral-400 mt-1 truncate max-w-xs">{item.notes}</p>}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`font-bold font-poppins ${item.status === 'paid' ? 'text-neutral-400' : 'text-[#D63384]'}`}>Rp {Number(item.amount).toLocaleString('id-ID')}</span>
                        </td>
                        <td className="p-4">
                          {item.due_date ? (
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${dateBg} ${dateColor}`}>
                              {new Date(item.due_date).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="p-4 text-center">
                          {item.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full uppercase">
                              <CheckCircle className="w-3.5 h-3.5" /> Lunas
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-100 text-amber-600 px-3 py-1 rounded-full uppercase">
                              <Clock className="w-3.5 h-3.5" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button 
                              onClick={() => handleUpdateStatus(item.id, item.status)} 
                              className={`px-3 py-1.5 rounded-lg text-xs font-poppins font-bold transition-all cursor-pointer border ${item.status === 'paid' ? 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-100' : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-500 hover:text-white'}`}
                            >
                              {item.status === 'paid' ? 'Batalkan Lunas' : 'Bayar Lunas'}
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 bg-white border border-neutral-200 hover:bg-red-50 text-neutral-400 hover:text-red-500 hover:border-red-200 rounded-lg transition-all cursor-pointer" title="Hapus Data">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* =========================================================
          MODAL: TAMBAH FAKTUR HUTANG
          ========================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-100 w-full max-w-lg p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-neutral-100 pb-4">
              <h2 className="text-xl font-poppins font-bold text-neutral-800 flex items-center gap-2">
                <Plus className="w-6 h-6 text-[#EC6BA5]" /> Catat Faktur Baru
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-neutral-400 hover:text-neutral-700 bg-neutral-50 hover:bg-neutral-100 p-2 rounded-full transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Nama PBF / Supplier</label>
                <input type="text" required value={formData.supplier_name} onChange={e => setFormData({...formData, supplier_name: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all placeholder:text-neutral-400 font-medium" placeholder="Contoh: PT. AAM, Enseval..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Nomor Faktur (Opsional)</label>
                  <input type="text" value={formData.invoice_number} onChange={e => setFormData({...formData, invoice_number: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-mono placeholder:text-neutral-400" placeholder="INV-2026/..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Jatuh Tempo</label>
                  <input type="date" required value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-medium" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Total Tagihan Bersih (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-[#D63384] font-bold">Rp</span>
                  <input type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-[#FFF3F7] border border-[#F8B3CF] pl-12 pr-4 py-3.5 rounded-xl text-[#D63384] font-bold text-xl focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-mono" placeholder="0" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Catatan Tambahan (Opsional)</label>
                <textarea rows="2" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all placeholder:text-neutral-400 text-sm" placeholder="Catatan faktur..."></textarea>
              </div>

              <div className="pt-4 border-t border-neutral-100 flex gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="w-1/3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 py-3.5 rounded-xl font-poppins font-semibold transition-all cursor-pointer">
                  Batal
                </button>
                <button type="submit" disabled={processLoading} className="w-2/3 bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white py-3.5 rounded-xl font-poppins font-bold shadow-[0_4px_15px_rgba(214,51,132,0.25)] hover:shadow-[0_6px_20px_rgba(214,51,132,0.4)] transition-all cursor-pointer disabled:opacity-50 flex justify-center items-center gap-2">
                  {processLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Simpan Faktur Hutang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}