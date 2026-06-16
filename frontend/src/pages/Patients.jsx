import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Users, Search, Plus, Edit, Trash2, X, Phone, Mail, MapPin } from 'lucide-react';

export default function Patients() {
  const { token } = useAuthStore();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [processLoading, setProcessLoading] = useState(false);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gender: 'P'
  });

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/patients?search=${search}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatients(res.data.data);
    } catch (error) {
      console.error('Gagal mengambil data pasien:', error);
    } finally {
      setLoading(false);
    }
  };

  // Efek debounce agar tidak terlalu sering menembak API saat mengetik pencarian
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPatients();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, token]);

  const handleOpenModal = (patient = null) => {
    if (patient) {
      setEditId(patient.id);
      setFormData({
        name: patient.name,
        phone: patient.phone || '',
        email: patient.email || '',
        address: patient.address || '',
        gender: patient.gender || 'P'
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
        // ✅ SUDAH DIPERBAIKI: Penutup string menggunakan backtick (`)
        await axios.post(`${import.meta.env.VITE_API_URL}/patients`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setModalOpen(false);
      fetchPatients();
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal menyimpan data pasien');
    } finally {
      setProcessLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus data pasien ini secara permanen? Data transaksi yang terkait mungkin akan kehilangan referensi nama.')) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL}/patients/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchPatients();
      } catch (error) {
        alert('Gagal menghapus data pasien');
      }
    }
  };

  return (
    <div className="p-8 lg:p-10 font-inter bg-[#F8F9FA] min-h-full">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-poppins font-bold text-neutral-800 flex items-center gap-3 tracking-tight">
              <div className="p-2.5 bg-[#FFF3F7] rounded-xl shadow-sm">
                <Users className="w-7 h-7 text-[#D63384]" />
              </div>
              Buku Data Pasien
            </h1>
            <p className="text-neutral-500 mt-2 text-sm font-medium ml-14">Kelola informasi kontak, profil member, dan rekam jejak pelanggan klinik.</p>
          </div>
          
          <button 
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white px-5 py-3.5 rounded-xl font-poppins font-semibold flex items-center gap-2 transition-all shadow-[0_4px_12px_rgba(214,51,132,0.25)] hover:shadow-[0_6px_15px_rgba(214,51,132,0.4)] cursor-pointer"
          >
            <Plus className="w-5 h-5" /> Registrasi Pasien
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white p-2 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-neutral-100 mb-8">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-3.5 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Cari berdasarkan nama, kode member, atau nomor telepon..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent pl-12 pr-4 py-3 rounded-xl text-neutral-800 focus:outline-none font-medium"
            />
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white border border-neutral-100 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-neutral-100 text-neutral-500 font-poppins text-xs uppercase tracking-wider">
                  <th className="p-5 font-semibold">Identitas Pasien</th>
                  <th className="p-5 font-semibold">Kontak</th>
                  <th className="p-5 font-semibold">Jenis Kelamin</th>
                  <th className="p-5 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="p-10 text-center text-neutral-500 font-medium">Mencari data pasien...</td>
                  </tr>
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-10 text-center text-neutral-400 font-medium">Tidak ada pasien yang cocok dengan pencarian.</td>
                  </tr>
                ) : (
                  patients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-[#FFF3F7]/30 transition-colors">
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#EC6BA5] to-[#D63384] text-white flex items-center justify-center font-bold font-poppins text-lg shadow-sm shrink-0">
                            {patient.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-neutral-800 font-bold font-poppins text-sm">{patient.name}</span>
                            <span className="text-[11px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded font-mono font-semibold border border-neutral-200 mt-1 w-fit">
                              {patient.patient_code}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col gap-1.5 text-sm text-neutral-600 font-medium">
                          <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-neutral-400"/> {patient.phone || '-'}</span>
                          {patient.email && <span className="flex items-center gap-2 text-xs"><Mail className="w-3.5 h-3.5 text-neutral-400"/> {patient.email}</span>}
                          {patient.address && <span className="flex items-center gap-2 text-xs truncate max-w-[200px]"><MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0"/> {patient.address}</span>}
                        </div>
                      </td>
                      <td className="p-5">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          patient.gender === 'P' 
                            ? 'bg-rose-50 text-rose-600 border-rose-100' 
                            : 'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {patient.gender === 'P' ? 'Perempuan' : 'Laki-Laki'}
                        </span>
                      </td>
                      <td className="p-5">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleOpenModal(patient)} className="p-2.5 bg-white border border-neutral-200 hover:border-[#F8B3CF] hover:bg-[#FFF3F7] text-neutral-500 hover:text-[#D63384] rounded-xl transition-all cursor-pointer shadow-sm" title="Edit Data">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(patient.id)} className="p-2.5 bg-white border border-neutral-200 hover:border-red-200 hover:bg-red-50 text-neutral-500 hover:text-red-500 rounded-xl transition-all cursor-pointer shadow-sm" title="Hapus Data">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
          MODAL: TAMBAH / EDIT DATA PASIEN
          ========================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-100 w-full max-w-lg max-h-[90vh] overflow-y-auto p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-neutral-100 pb-4">
              <h2 className="text-xl font-poppins font-bold text-neutral-800 flex items-center gap-2">
                <Users className="w-6 h-6 text-[#EC6BA5]" /> {editId ? 'Perbarui Data Pasien' : 'Registrasi Pasien Baru'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-neutral-400 hover:text-neutral-700 bg-neutral-50 hover:bg-neutral-100 p-2 rounded-full transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Nama Lengkap Sesuai KTP</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3.5 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all placeholder:text-neutral-400 font-medium" placeholder="Contoh: Chelsea Islan" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Nomor WhatsApp</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3.5 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-mono placeholder:text-neutral-400" placeholder="0812..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Jenis Kelamin</label>
                  <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3.5 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all cursor-pointer font-medium appearance-none">
                    <option value="P">Perempuan</option>
                    <option value="L">Laki-Laki</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Alamat Email (Opsional)</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3.5 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all placeholder:text-neutral-400" placeholder="pasien@email.com" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Alamat Domisili (Opsional)</label>
                <textarea rows="2" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3.5 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all placeholder:text-neutral-400 text-sm" placeholder="Nama jalan, nomor rumah..."></textarea>
              </div>

              <div className="pt-4 border-t border-neutral-100 flex gap-3 mt-6">
                <button type="button" onClick={() => setModalOpen(false)} className="w-1/3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 py-4 rounded-xl font-poppins font-semibold transition-all cursor-pointer">
                  Batal
                </button>
                <button type="submit" disabled={processLoading} className="w-2/3 bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white py-4 rounded-xl font-poppins font-bold shadow-[0_4px_15px_rgba(214,51,132,0.25)] hover:shadow-[0_6px_20px_rgba(214,51,132,0.4)] transition-all cursor-pointer disabled:opacity-50 flex justify-center items-center gap-2">
                  {processLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}