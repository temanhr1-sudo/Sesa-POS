import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Clock, User, CheckCircle, AlertTriangle, Wallet, Lock } from 'lucide-react';

export default function ShiftHistory() {
  const { token } = useAuthStore();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/shifts/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShifts(res.data.data);
    } catch (error) {
      console.error('Gagal mengambil data shift:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [token]);

  // Kalkulasi matriks cepat untuk top widget
  const totalSelisihMinus = shifts.reduce((sum, s) => {
    if (s.status === 'closed') {
      const selisih = Number(s.actual_cash) - Number(s.expected_cash);
      return selisih < 0 ? sum + selisih : sum;
    }
    return sum;
  }, 0);

  return (
    <div className="p-8 lg:p-10 font-inter bg-[#F8F9FA] min-h-full">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-poppins font-bold text-neutral-800 flex items-center gap-3 tracking-tight">
              <div className="p-2.5 bg-[#FFF3F7] rounded-xl shadow-sm">
                <Clock className="w-7 h-7 text-[#D63384]" />
              </div>
              Audit Riwayat Shift
            </h1>
            <p className="text-neutral-500 mt-2 text-sm font-medium ml-14">Pantau histori buka/tutup kasir dan validasi kecocokan uang fisik.</p>
          </div>
          
          <div className="bg-white border border-neutral-200 px-6 py-3 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-poppins font-semibold text-neutral-500 mb-0.5">Total Uang Hilang / Selisih (-)</p>
              <h2 className="text-2xl font-poppins font-bold text-rose-600 tracking-tight">Rp {Math.abs(totalSelisihMinus).toLocaleString('id-ID')}</h2>
            </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white border border-neutral-100 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-neutral-100 text-neutral-500 font-poppins text-xs uppercase tracking-wider">
                  <th className="p-5 font-semibold">Petugas Kasir</th>
                  <th className="p-5 font-semibold">Durasi Waktu Jaga</th>
                  <th className="p-5 font-semibold text-right">Modal Awal</th>
                  <th className="p-5 font-semibold text-right">Target Sistem</th>
                  <th className="p-5 font-semibold text-right">Fisik Laci</th>
                  <th className="p-5 font-semibold text-right">Selisih</th>
                  <th className="p-5 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-neutral-500 font-medium">Memuat data riwayat shift...</td>
                  </tr>
                ) : shifts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-neutral-400 font-medium">Belum ada riwayat shift yang tercatat.</td>
                  </tr>
                ) : (
                  shifts.map((shift) => {
                    const expected = Number(shift.expected_cash || 0);
                    const actual = Number(shift.actual_cash || 0);
                    const selisih = actual - expected;
                    const isClosed = shift.status === 'closed';

                    return (
                      <tr key={shift.id} className="hover:bg-[#FFF3F7]/30 transition-colors">
                        
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-neutral-500" />
                            </div>
                            <span className="text-neutral-800 font-bold font-poppins text-sm">{shift.cashier_name || 'Kasir Tidak Diketahui'}</span>
                          </div>
                        </td>

                        <td className="p-5">
                          <div className="flex flex-col text-xs font-medium text-neutral-600 font-mono">
                            <span className="text-emerald-600 mb-1">Mulai: {new Date(shift.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })}</span>
                            {isClosed ? (
                              <span className="text-neutral-500">Tutup: {new Date(shift.end_time).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })}</span>
                            ) : (
                              <span className="text-amber-500 font-bold">Sedang Berjalan...</span>
                            )}
                          </div>
                        </td>

                        <td className="p-5 text-right font-medium text-neutral-500 text-sm">
                          Rp {Number(shift.starting_cash).toLocaleString('id-ID')}
                        </td>

                        <td className="p-5 text-right font-semibold text-neutral-800 text-sm">
                          {isClosed ? `Rp ${expected.toLocaleString('id-ID')}` : '-'}
                        </td>

                        <td className="p-5 text-right font-bold text-[#D63384] text-sm">
                          {isClosed ? `Rp ${actual.toLocaleString('id-ID')}` : '-'}
                        </td>

                        <td className="p-5 text-right">
                          {!isClosed ? (
                            <span className="text-neutral-400 font-medium text-xs">-</span>
                          ) : (
                            <span className={`font-poppins font-bold text-sm px-2.5 py-1 rounded-md ${
                              selisih < 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                              selisih > 0 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                              'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            }`}>
                              {selisih > 0 ? '+' : ''}{selisih === 0 ? 'COCOK' : `Rp ${selisih.toLocaleString('id-ID')}`}
                            </span>
                          )}
                        </td>

                        <td className="p-5 text-center">
                          {isClosed ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 uppercase tracking-wide">
                              <Lock className="w-3.5 h-3.5" /> Ditutup
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wide border border-emerald-100">
                              <CheckCircle className="w-3.5 h-3.5" /> Aktif
                            </span>
                          )}
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}