import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { 
  Wallet, ArrowUpRight, ArrowDownLeft, Plus, X, Calendar, 
  FileText, Download, Printer, Filter
} from 'lucide-react';

export default function Cashflow() {
  const { token } = useAuthStore();
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [processLoading, setProcessLoading] = useState(false);

  // Filter State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [formData, setFormData] = useState({
    type: 'in', 
    amount: '',
    category: 'Setoran Kasir',
    notes: ''
  });

  const fetchCashflow = async () => {
    try {
      setLoading(true);
      // ✅ SUDAH DIPERBAIKI: Menggunakan Backtick (`)
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/cashflow`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLedger(res.data.data);
    } catch (error) {
      console.error('Gagal mengambil data buku kas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashflow();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) return alert('Nominal transaksi tidak valid!');

    setProcessLoading(true);
    try {
      // ✅ SUDAH DIPERBAIKI: Menggunakan Backtick (`)
      await axios.post(`${import.meta.env.VITE_API_URL}/cashflow`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setModalOpen(false);
      setFormData({ type: 'in', amount: '', category: 'Operasional', notes: '' });
      fetchCashflow();
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal menyimpan transaksi kas');
    } finally {
      setProcessLoading(false);
    }
  };

  // ==========================================
  // LOGIKA FILTER RENTANG TANGGAL (DATE RANGE)
  // ==========================================
  const filteredLedger = ledger.filter(item => {
    if (!startDate && !endDate) return true;
    
    const itemDate = new Date(item.created_at);
    // Set ke jam 00:00:00 untuk start
    const start = startDate ? new Date(startDate) : new Date('2000-01-01');
    start.setHours(0, 0, 0, 0);
    
    // Set ke jam 23:59:59 untuk end
    const end = endDate ? new Date(endDate) : new Date('2100-01-01');
    end.setHours(23, 59, 59, 999);
    
    return itemDate >= start && itemDate <= end;
  });

  // ==========================================
  // EXPORT KE CSV / EXCEL
  // ==========================================
  const exportToCSV = () => {
    if (filteredLedger.length === 0) return alert('Tidak ada data untuk diekspor pada rentang tanggal ini.');

    // Membuat header CSV
    let csvContent = "Tanggal Transaksi,Tipe Arus,Kategori Alokasi,Nominal (Rp),Catatan Keterangan\n";
    
    filteredLedger.forEach(item => {
      // Perbaikan Zona Waktu ke WIB untuk Export Excel
      const date = new Date(item.created_at).toLocaleString('id-ID', { 
        timeZone: 'Asia/Jakarta',
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }) + ' WIB';

      const type = item.type === 'in' ? 'Pemasukan' : 'Pengeluaran';
      const category = item.category;
      const amount = item.amount;
      // Menghilangkan koma atau baris baru di dalam string catatan agar CSV tidak rusak
      const notes = `"${(item.notes || '').replace(/"/g, '""')}"`; 
      
      csvContent += `${date},${type},${category},${amount},${notes}\n`;
    });

    // Proses Download Blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Kas_${startDate || 'All'}_sampai_${endDate || 'All'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const executePrint = () => {
    window.print();
  };

  // ==========================================
  // MATRIKS PERHITUNGAN DINAMIS (Berdasarkan Filter)
  // ==========================================
  const totalPemasukan = filteredLedger.filter(item => item.type === 'in').reduce((sum, i) => sum + Number(i.amount), 0);
  const totalPengeluaran = filteredLedger.filter(item => item.type === 'out').reduce((sum, i) => sum + Number(i.amount), 0);
  const saldoAktual = totalPemasukan - totalPengeluaran;

  return (
    <div className="p-6 md:p-10 font-inter bg-[#F8F9FA] min-h-full print:bg-white print:p-0">
      
      {/* CSS KHUSUS UNTUK CETAK LAPORAN (PRINT VIEW) */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 1.5cm; }
          body { background-color: white !important; }
          aside, nav, .print\\:hidden, .no-print { display: none !important; }
          .print-area { display: block !important; width: 100% !important; color: black !important; }
          .print-header { border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e5e7eb !important; padding: 12px !important; text-align: left; }
          th { background-color: #f3f4f6 !important; font-weight: bold !important; -webkit-print-color-adjust: exact; }
          .shadow-sm, .shadow-md, .shadow-2xl { box-shadow: none !important; }
          .rounded-2xl, .rounded-xl { border-radius: 0 !important; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto print-area">
        
        {/* HEADER SECTION (Printable & Screen) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="print-header w-full">
            <h1 className="text-3xl font-poppins font-bold text-neutral-800 flex items-center gap-3 tracking-tight">
              <div className="p-2.5 bg-[#FFF3F7] rounded-xl shadow-sm print:hidden">
                <Wallet className="w-7 h-7 text-[#D63384]" />
              </div>
              Buku Kas & Arus Keuangan
            </h1>
            <p className="text-neutral-500 mt-2 text-sm font-medium md:ml-14 print:ml-0">
              Laporan Mutasi Keuangan Klinik
              {(startDate || endDate) && <span className="font-bold text-neutral-800 ml-2">({startDate || 'Awal'} s/d {endDate || 'Sekarang'})</span>}
            </p>
          </div>
          
          <div className="flex gap-3 print:hidden">
            <button 
              onClick={() => setModalOpen(true)}
              className="bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white px-5 py-3 rounded-xl font-poppins font-semibold flex items-center gap-2 transition-all shadow-[0_4px_12px_rgba(214,51,132,0.25)] hover:shadow-[0_6px_15px_rgba(214,51,132,0.4)] cursor-pointer"
            >
              <Plus className="w-5 h-5" /> Catat Kas
            </button>
          </div>
        </div>

        {/* WIDGET FILTER & EXPORT ROW (Screen Only) */}
        <div className="bg-white border border-neutral-200 p-4 rounded-2xl shadow-sm mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
          
          {/* Kontrol Rentang Tanggal */}
          <div className="flex flex-col md:flex-row items-center gap-3 flex-1">
            <div className="flex items-center bg-[#F8F9FA] border border-neutral-200 rounded-xl px-3 py-2 w-full md:w-auto focus-within:border-[#D63384] transition-all">
              <Filter className="w-4 h-4 text-neutral-400 mr-2" />
              <span className="text-xs font-semibold text-neutral-500 mr-2 whitespace-nowrap">Mulai:</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-sm font-medium text-neutral-800 outline-none w-full cursor-pointer"
              />
            </div>
            <span className="text-neutral-400 hidden md:block">-</span>
            <div className="flex items-center bg-[#F8F9FA] border border-neutral-200 rounded-xl px-3 py-2 w-full md:w-auto focus-within:border-[#D63384] transition-all">
              <span className="text-xs font-semibold text-neutral-500 mr-2 whitespace-nowrap">Hingga:</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-sm font-medium text-neutral-800 outline-none w-full cursor-pointer"
              />
            </div>
            
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Tombol Export */}
          <div className="flex items-center gap-3">
            <button 
              onClick={exportToCSV}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 px-4 py-2.5 rounded-xl font-poppins font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button 
              onClick={executePrint}
              className="bg-neutral-800 hover:bg-black text-white px-4 py-2.5 rounded-xl font-poppins font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shadow-md"
            >
              <Printer className="w-4 h-4" /> Cetak Laporan
            </button>
          </div>
        </div>

        {/* FINANCIAL DASHBOARD WIDGETS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* SALDO AKTUAL */}
          <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-sm flex items-center gap-5 print:border-neutral-800">
            <div className="w-14 h-14 bg-gradient-to-br from-[#EC6BA5] to-[#D63384] text-white rounded-2xl flex items-center justify-center shadow-md print:hidden">
              <Wallet className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-poppins font-semibold text-neutral-400 mb-0.5 uppercase tracking-wider print:text-neutral-800">Total Net Kas (Periode Ini)</p>
              <h2 className="text-2xl font-poppins font-bold text-neutral-800 tracking-tight">Rp {saldoAktual.toLocaleString('id-ID')}</h2>
            </div>
          </div>

          {/* TOTAL INFLOW */}
          <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-sm flex items-center gap-5 print:border-neutral-800">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center border border-emerald-100 print:hidden">
              <ArrowUpRight className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-poppins font-semibold text-neutral-400 mb-0.5 uppercase tracking-wider print:text-neutral-800">Total Pemasukan</p>
              <h2 className="text-2xl font-poppins font-bold text-emerald-600 print:text-neutral-800 tracking-tight">Rp {totalPemasukan.toLocaleString('id-ID')}</h2>
            </div>
          </div>

          {/* TOTAL OUTFLOW */}
          <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-sm flex items-center gap-5 print:border-neutral-800">
            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-100 print:hidden">
              <ArrowDownLeft className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-poppins font-semibold text-neutral-400 mb-0.5 uppercase tracking-wider print:text-neutral-800">Total Pengeluaran</p>
              <h2 className="text-2xl font-poppins font-bold text-rose-600 print:text-neutral-800 tracking-tight">Rp {totalPengeluaran.toLocaleString('id-ID')}</h2>
            </div>
          </div>
        </div>

        {/* LEDGER MUTATION TABLE */}
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none">
          <div className="p-5 border-b border-neutral-100 bg-white print:px-0">
            <h3 className="font-poppins font-bold text-neutral-800 text-lg">Buku Besar Mutasi Kas {startDate ? '(Filtered)' : ''}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-neutral-200 text-neutral-600 font-poppins text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold print:text-xs">Tanggal & Waktu</th>
                  <th className="p-4 font-semibold print:text-xs">Kategori Alokasi</th>
                  <th className="p-4 font-semibold print:text-xs">Keterangan Catatan</th>
                  <th className="p-4 font-semibold text-right print:text-xs">Nominal Arus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="p-10 text-center text-neutral-500 font-medium">Memuat buku besar kas...</td>
                  </tr>
                ) : filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-10 text-center text-neutral-400 font-medium">Tidak ada transaksi ditemukan pada rentang tanggal ini.</td>
                  </tr>
                ) : (
                  filteredLedger.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="p-4 font-medium text-xs text-neutral-500 font-mono print:text-black">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-neutral-400 print:hidden" />
                          {/* Perbaikan Zona Waktu ke WIB untuk Tabel Layar */}
                          {new Date(item.created_at).toLocaleString('id-ID', { 
                            timeZone: 'Asia/Jakarta',
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })} WIB
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-bold font-poppins bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full border border-neutral-200 uppercase tracking-wide print:border-none print:p-0 print:bg-transparent">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium text-neutral-700 max-w-sm truncate flex items-center gap-1.5 print:max-w-none print:whitespace-normal">
                          <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0 print:hidden" />
                          {item.notes || <span className="text-neutral-300 italic font-normal print:hidden">Tidak ada deskripsi</span>}
                        </p>
                      </td>
                      <td className="p-4 text-right">
                        <span className={`font-poppins font-bold text-base print:text-black ${
                          item.type === 'in' ? 'text-emerald-600' : 'text-rose-500'
                        }`}>
                          {item.type === 'in' ? '+' : '-'} Rp {Number(item.amount).toLocaleString('id-ID')}
                        </span>
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
          MODAL: INPUT MANUAl TRANSAKSI KAS (IN / OUT)
          ========================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-white border border-neutral-100 w-full max-w-md p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-neutral-100 pb-4">
              <h2 className="text-xl font-poppins font-bold text-neutral-800 flex items-center gap-2">
                <Plus className="w-6 h-6 text-[#EC6BA5]" /> Catat Kas Manual
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-neutral-400 hover:text-neutral-700 bg-neutral-50 hover:bg-neutral-100 p-2 rounded-full transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* TIPE MUTASI */}
              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-2.5 font-poppins">Jenis Pergerakan Kas</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, type: 'in', category: 'Setoran Kasir'})}
                    className={`py-3 rounded-xl font-poppins font-bold text-sm border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      formData.type === 'in' 
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-inner' 
                        : 'bg-white border-neutral-200 text-neutral-400 hover:bg-neutral-50'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" /> Uang Masuk
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, type: 'out', category: 'Operasional'})}
                    className={`py-3 rounded-xl font-poppins font-bold text-sm border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      formData.type === 'out' 
                        ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-inner' 
                        : 'bg-white border-neutral-200 text-neutral-400 hover:bg-neutral-50'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" /> Uang Keluar
                  </button>
                </div>
              </div>

              {/* KATEGORI DINAMIS */}
              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Kategori Alokasi</label>
                <select 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                  className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-medium cursor-pointer appearance-none"
                >
                  {formData.type === 'in' ? (
                    <>
                      <option value="Setoran Kasir">Setoran Kasir (Tutup Shift)</option>
                      <option value="Suntikan Modal">Suntikan Dana Modal Owner</option>
                      <option value="Pendapatan Lainnya">Pendapatan Lain-Lain</option>
                    </>
                  ) : (
                    <>
                      <option value="Operasional">Biaya Operasional Klinik</option>
                      <option value="Listrik & Air">Tagihan Listrik / Air / Internet</option>
                      <option value="Gaji Karyawan">Gaji Staf & Dokter</option>
                      <option value="Pembelian Stok">Pembelian Obat / Alkes / Bahan Baku</option>
                      <option value="Pemasaran">Biaya Iklan & Marketing</option>
                    </>
                  )}
                </select>
              </div>

              {/* NOMINAL */}
              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Nominal Dana (Rp)</label>
                <div className="relative">
                  <span className={`absolute left-4 top-3.5 font-bold ${formData.type === 'in' ? 'text-emerald-600' : 'text-rose-500'}`}>Rp</span>
                  <input 
                    type="number" 
                    required 
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: e.target.value})} 
                    className={`w-full pl-12 pr-4 py-3.5 rounded-xl font-bold text-xl focus:outline-none focus:ring-2 transition-all font-mono ${
                      formData.type === 'in' 
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-500/20' 
                        : 'bg-rose-50/30 border-rose-200 text-rose-600 focus:border-rose-500 focus:ring-rose-500/20'
                    }`}
                    placeholder="0" 
                  />
                </div>
              </div>

              {/* CATATAN */}
              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Deskripsi / Keterangan (Opsional)</label>
                <textarea rows="2" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all placeholder:text-neutral-400 text-sm" placeholder="Contoh: Bayar token listrik lantai 2..."></textarea>
              </div>

              {/* FOOTER ACTION */}
              <div className="pt-4 border-t border-neutral-100 flex gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="w-1/3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 py-3.5 rounded-xl font-poppins font-semibold transition-all cursor-pointer">
                  Batal
                </button>
                <button type="submit" disabled={processLoading} className="w-2/3 bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white py-3.5 rounded-xl font-poppins font-bold shadow-[0_4px_15px_rgba(214,51,132,0.25)] hover:shadow-[0_6px_20px_rgba(214,51,132,0.4)] transition-all cursor-pointer disabled:opacity-50 flex justify-center items-center gap-2">
                  {processLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Simpan Transaksi Kas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}