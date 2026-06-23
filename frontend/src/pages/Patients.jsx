import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { 
  Users, Search, Plus, Edit, Trash2, X, CheckCircle, 
  MessageSquare, Send, CheckSquare, Square
} from 'lucide-react';

export default function Patients() {
  const { token } = useAuthStore();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // State Pilihan Checkbox untuk WA Blast massal
  const [selectedIds, setSelectedIds] = useState([]);

  // State Modal Master Pasien
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [processLoading, setProcessLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', address: '', gender: 'P'
  });

  // State Modal WA Blast Massal
  const [blastModalOpen, setBlastModalOpen] = useState(false);
  const [blastMessage, setBlastMessage] = useState('Halo {nama}, terima kasih telah mempercayakan perawatan kulit Anda di Sesa Dermatology. Ada promo menarik khusus minggu ini!');
  const [currentBlastIndex, setCurrentBlastIndex] = useState(0);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/patients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatients(res.data.data);
    } catch (error) {
      console.error('Gagal memuat data pasien:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [token]);

  // === OPTIMASI HELPER CONVERT NO HP KE FORMAT WHATSAPP (628...) ===
  const formatWAUrl = (phone, msg) => {
    if (!phone) return '#';
    let cleaned = phone.replace(/\D/g, ''); // Ambil angka saja
    
    // Otomatis koreksi awalan nomor agar sesuai standar internasional WA (62)
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    } else if (cleaned.startsWith('8')) {
      cleaned = '62' + cleaned;
    }
    
    return `https://api.whatsapp.com/send?phone=${cleaned}&text=${encodeURIComponent(msg)}`;
  };

  // === LOGIKA SELEKSI CHECKBOX ===
  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (filteredList) => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]); // Uncheck all
    } else {
      setSelectedIds(filteredList.map(p => p.id)); // Check all yang muncul di search
    }
  };

  // === ACTION DIRECT WHATSAPP PER BARIS ===
  const handleDirectWA = (item) => {
    const customMsg = `Halo Kak ${item.name}, kami dari admin Sesa Dermatology ingin mengonfirmasi...`;
    window.open(formatWAUrl(item.phone, customMsg), '_blank');
  };

  // === MANAGEMENT DATA PASIEN (CRUD) ===
  const handleOpenModal = (item = null) => {
    if (item) {
      setEditId(item.id);
      setFormData({
        name: item.name, phone: item.phone, email: item.email || '', address: item.address || '', gender: item.gender
      });
    } else {
      setEditId(null);
      setFormData({ name: '', phone: '', email: '', address: '', gender: 'P' });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessLoading(true);
    try {
      if (editId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/patients/${editId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/patients`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setModalOpen(false);
      fetchPatients();
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal memproses data pasien');
    } finally {
      setProcessLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Hapus data pasien ini secara permanen?')) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL}/patients/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSelectedIds(selectedIds.filter(item => item !== id));
        fetchPatients();
      } catch (error) {
        alert('Gagal menghapus data pasien');
      }
    }
  };

  // === RUNNING TRACKER UNTUK WA BLAST MASSAL ===
  const selectedPatientsData = patients.filter(p => selectedIds.includes(p.id));

  const handleExecuteNextBlast = () => {
    if (currentBlastIndex >= selectedPatientsData.length) return;

    const currentPatient = selectedPatientsData[currentBlastIndex];
    // Ganti kata kunci {nama} secara ajaib sesuai nama pasien aktif
    const personalizedMsg = blastMessage.replace(/{nama}/g, currentPatient.name);
    
    // Buka tab WhatsApp Web/App baru
    window.open(formatWAUrl(currentPatient.phone, personalizedMsg), '_blank');

    // Geser antrean ke baris berikutnya
    setCurrentBlastIndex(prev => prev + 1);
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.phone.includes(search) || 
    p.patient_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 font-inter bg-[#F8F9FA] min-h-full">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-poppins font-bold text-neutral-800 flex items-center gap-3 tracking-tight">
              <div className="p-2.5 bg-[#FFF3F7] rounded-xl shadow-sm">
                <Users className="w-7 h-7 text-[#D63384]" />
              </div>
              Database Pasien & Member
            </h1>
            <p className="text-neutral-500 mt-2 text-sm font-medium ml-14">Kelola rekam data kontak member, alamat tinggal, beserta riwayat komunikasi.</p>
          </div>
          
          <button 
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white px-5 py-3.5 rounded-xl font-poppins font-semibold flex items-center gap-2 transition-all shadow-[0_4px_12px_rgba(214,51,132,0.25)] hover:shadow-[0_6px_15px_rgba(214,51,132,0.4)] cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-5 h-5" /> Tambah Pasien baru
          </button>
        </div>

        {/* SEARCH BAR & FLOATING ACTION ACTION WA BLAST */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-1/3">
            <Search className="w-5 h-5 absolute left-4 top-3.5 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Cari Nama / Kontak / Kode..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-neutral-200 pl-12 pr-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 focus:ring-[#D63384]/20 transition-all font-medium"
            />
          </div>

          {/* Muncul anggun hanya jika ada baris data yang dicentang admin */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-4 bg-[#FFF3F7] border border-[#F8B3CF]/30 px-5 py-2.5 rounded-xl animate-in slide-in-from-right duration-300 w-full md:w-auto justify-between md:justify-start">
              <span className="text-sm font-semibold text-[#D63384] font-poppins">{selectedIds.length} Pasien Terpilih</span>
              <button 
                onClick={() => { setCurrentBlastIndex(0); setBlastModalOpen(true); }}
                className="bg-[#D63384] hover:bg-[#8A1E4D] text-white px-4 py-2 rounded-lg text-xs font-bold font-poppins flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" /> Proses WA Blast Massal
              </button>
            </div>
          )}
        </div>

        {/* DATA TABLE */}
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-neutral-200 text-neutral-600 font-poppins text-xs uppercase tracking-wider">
                  <th className="p-4 w-12 text-center">
                    <button 
                      onClick={() => handleSelectAll(filteredPatients)}
                      className="text-[#D63384] hover:opacity-80 transition-opacity cursor-pointer flex justify-center w-full"
                    >
                      {selectedIds.length === filteredPatients.length && filteredPatients.length > 0 ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5 text-neutral-300" />
                      )}
                    </button>
                  </th>
                  <th className="p-4 font-semibold">Kode Pasien</th>
                  <th className="p-4 font-semibold">Nama Lengkap</th>
                  <th className="p-4 font-semibold">Kontak WA & Email</th>
                  <th className="p-4 font-semibold">Alamat Rumah</th>
                  <th className="p-4 font-semibold text-center">Hubungi</th>
                  <th className="p-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr><td colSpan="7" className="p-10 text-center text-neutral-500 font-medium">Memuat data rekam medis pasien...</td></tr>
                ) : filteredPatients.length === 0 ? (
                  <tr><td colSpan="7" className="p-10 text-center text-neutral-400 font-medium">Tidak ada data pasien terdaftar.</td></tr>
                ) : (
                  filteredPatients.map((item) => {
                    const isChecked = selectedIds.includes(item.id);
                    return (
                      <tr key={item.id} className={`hover:bg-[#FFF3F7]/10 transition-colors ${isChecked ? 'bg-[#FFF3F7]/40' : ''}`}>
                        <td className="p-4 text-center">
                          <button onClick={() => handleSelectRow(item.id)} className="text-[#D63384] cursor-pointer flex justify-center w-full">
                            {isChecked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-neutral-300" />}
                          </button>
                        </td>
                        <td className="p-4"><span className="font-mono font-bold text-neutral-700 text-xs bg-neutral-100 px-2 py-1 rounded border border-neutral-200">{item.patient_code}</span></td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-poppins font-bold text-neutral-800 text-sm">{item.name}</span>
                            <span className="text-[10px] text-neutral-400 uppercase font-semibold mt-0.5">{item.gender === 'P' ? '🟢 Perempuan' : '🔵 Laki-Laki'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col text-xs font-medium text-neutral-600 gap-0.5">
                            <span className="font-mono">{item.phone}</span>
                            <span className="text-neutral-400 lowercase">{item.email || 'tanpa-email'}</span>
                          </div>
                        </td>
                        <td className="p-4"><p className="text-xs font-medium text-neutral-500 line-clamp-2 max-w-xs">{item.address || 'Belum diisi'}</p></td>
                        <td className="p-4 text-center">
                          {/* TOMBOL LINK WHATSAPP INSTAN INDIVIDUAL */}
                          <button 
                            onClick={() => handleDirectWA(item)}
                            className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-500 border border-emerald-200 text-emerald-600 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold font-poppins shadow-sm transition-all cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Chat WA
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleOpenModal(item)} className="p-2 bg-neutral-50 border border-neutral-200 hover:border-[#F8B3CF] hover:bg-[#FFF3F7] text-neutral-500 hover:text-[#D63384] rounded-lg transition-all cursor-pointer shadow-sm"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(item.id)} className="p-2 bg-neutral-50 border border-neutral-200 hover:border-red-200 hover:bg-red-50 text-neutral-500 hover:text-red-500 rounded-lg transition-all cursor-pointer shadow-sm"><Trash2 className="w-4 h-4" /></button>
                          </div>
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

      {/* =========================================================
          MODAL: SCREEN ASSISTANT WA BLAST MASSAL (PREMIUM UX)
          ========================================================= */}
      {blastModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-100 w-full max-w-lg p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-neutral-100 pb-4">
              <h2 className="text-xl font-poppins font-bold text-neutral-800 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-[#D63384]" /> Asisten Pengirim Pesan Massal
              </h2>
              <button onClick={() => setBlastModalOpen(false)} className="text-neutral-400 hover:text-neutral-700 bg-neutral-50 hover:bg-neutral-100 p-2 rounded-full transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-2 font-poppins flex justify-between">
                  <span>Template Isi Pesan</span>
                  <span className="text-xs font-bold text-[#D63384]">Gunakan sandi kode {"{nama}"}</span>
                </label>
                <textarea 
                  rows="4"
                  value={blastMessage}
                  onChange={(e) => setBlastMessage(e.target.value)}
                  disabled={currentBlastIndex > 0} // Kunci text area jika blast sudah mulai berjalan
                  className="w-full bg-[#F8F9FA] border border-neutral-200 p-4 rounded-2xl text-neutral-800 text-sm focus:outline-none focus:border-[#D63384] transition-all resize-none disabled:opacity-60 font-medium leading-relaxed"
                />
              </div>

              {/* LIVE COUNTER TRACKER */}
              <div className="bg-[#F8F9FA] border border-neutral-200 p-5 rounded-2xl">
                <div className="flex justify-between text-xs font-bold text-neutral-500 font-poppins mb-3 uppercase tracking-wide">
                  <span>Progress Antrean</span>
                  <span>{currentBlastIndex} / {selectedPatientsData.length} Selesai</span>
                </div>
                <div className="w-full h-2.5 bg-neutral-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#EC6BA5] to-[#D63384] transition-all duration-300" 
                    style={{ width: `${(currentBlastIndex / selectedPatientsData.length) * 100}%` }}
                  ></div>
                </div>

                {/* TARGET PASIEN BERIKUTNYA */}
                {currentBlastIndex < selectedPatientsData.length ? (
                  <div className="mt-4 pt-4 border-t border-neutral-200 border-dashed flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-neutral-400 uppercase font-bold">Tujuan Antrean Berikutnya:</p>
                      <p className="text-sm font-bold font-poppins text-neutral-800 mt-0.5">
                        {selectedPatientsData[currentBlastIndex]?.name}
                      </p>
                      <p className="text-xs text-neutral-500 font-mono mt-0.5">{selectedPatientsData[currentBlastIndex]?.phone}</p>
                    </div>
                    
                    <button 
                      onClick={handleExecuteNextBlast}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-xl text-xs font-bold font-poppins flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer animate-pulse"
                    >
                      <Send className="w-3.5 h-3.5" /> Kirim Sekarang
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-neutral-200 border-dashed text-center">
                    <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 inline-block font-poppins">
                      🎉 Selamat! Seluruh Pesan Blast Berhasil Diproses
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => { setBlastModalOpen(false); setSelectedIds([]); }}
                  className="bg-neutral-800 hover:bg-black text-white px-5 py-3 rounded-xl font-poppins font-bold text-xs transition-colors cursor-pointer shadow-md"
                >
                  Selesai & Reset Pilihan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: TAMBAH / EDIT MASTER DATA PASIEN
          ========================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-100 w-full max-w-md p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-neutral-100 pb-4">
              <h2 className="text-xl font-poppins font-bold text-neutral-800 flex items-center gap-2">
                <Users className="w-6 h-6 text-[#EC6BA5]" /> {editId ? 'Ubah Profil Pasien' : 'Registrasi Pasien Baru'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-neutral-400 hover:text-neutral-700 bg-neutral-50 hover:bg-neutral-100 p-2 rounded-full transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Nama Lengkap Pasien</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-medium placeholder:text-neutral-400" placeholder="Contoh: Dian Sastrowardoyo" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Nomor WhatsApp</label>
                  <input type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-mono placeholder:font-sans placeholder:text-sm placeholder:text-neutral-400" placeholder="08..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Jenis Kelamin</label>
                  <select required value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-medium cursor-pointer appearance-none">
                    <option value="P">Perempuan</option>
                    <option value="L">Laki-Laki</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Email (Opsional)</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-medium placeholder:text-neutral-400" placeholder="pasien@email.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Alamat Lengkap Rumah</label>
                <textarea 
                  rows="3" 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  className="w-full bg-[#F8F9FA] border border-neutral-200 p-4 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all text-sm font-medium placeholder:text-neutral-400 resize-none leading-relaxed" 
                  placeholder="Masukkan domisili tempat tinggal..."
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="w-1/3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 py-3.5 rounded-xl font-poppins font-semibold transition-all cursor-pointer">Batal</button>
                <button type="submit" disabled={processLoading} className="w-2/3 bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white py-3.5 rounded-xl font-poppins font-bold shadow-[0_4px_15px_rgba(214,51,132,0.25)] hover:shadow-[0_6px_20px_rgba(214,51,132,0.4)] transition-all cursor-pointer disabled:opacity-50 flex justify-center items-center gap-2">
                  {processLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><CheckCircle className="w-5 h-5" /> Simpan Data</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}