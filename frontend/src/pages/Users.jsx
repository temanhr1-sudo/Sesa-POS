import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Shield, Plus, Edit, Trash2, X, User, Mail, Key, ShieldCheck } from 'lucide-react';

export default function Users() {
  const { token, user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [processLoading, setProcessLoading] = useState(false);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'kasir'
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data.data);
    } catch (error) {
      console.error('Gagal mengambil data pengguna:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleOpenModal = (userData = null) => {
    if (userData) {
      setEditId(userData.id);
      setFormData({
        name: userData.name,
        email: userData.email,
        password: '', // Kosongkan, hanya diisi jika admin mau mengubahnya
        role: userData.role
      });
    } else {
      setEditId(null);
      setFormData({ name: '', email: '', password: '', role: 'kasir' });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessLoading(true);
    try {
      if (editId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/users/${editId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        if (!formData.password) return alert('Password wajib diisi untuk akun baru!');
        await axios.post(`${import.meta.env.VITE_API_URL}/users`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setModalOpen(false);
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal menyimpan data akun');
    } finally {
      setProcessLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (id === currentUser.id) return alert('Anda tidak bisa menghapus akun Anda sendiri saat sedang login!');
    
    if (window.confirm('PERINGATAN: Yakin ingin menghapus akun ini secara permanen? Mereka tidak akan bisa login lagi.')) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL}/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchUsers();
      } catch (error) {
        alert('Gagal menghapus akun pengguna');
      }
    }
  };

  return (
    <div className="p-8 lg:p-10 font-inter bg-[#F8F9FA] min-h-full">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-poppins font-bold text-neutral-800 flex items-center gap-3 tracking-tight">
              <div className="p-2.5 bg-[#FFF3F7] rounded-xl shadow-sm">
                <Shield className="w-7 h-7 text-[#D63384]" />
              </div>
              Kelola Hak Akses
            </h1>
            <p className="text-neutral-500 mt-2 text-sm font-medium ml-14">Atur akun staf, kasir, dan tingkat kewenangan sistem Sesa Dermatology.</p>
          </div>
          
          <button 
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white px-5 py-3.5 rounded-xl font-poppins font-semibold flex items-center gap-2 transition-all shadow-[0_4px_12px_rgba(214,51,132,0.25)] hover:shadow-[0_6px_15px_rgba(214,51,132,0.4)] cursor-pointer"
          >
            <Plus className="w-5 h-5" /> Buat Akun Baru
          </button>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white border border-neutral-100 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-neutral-100 text-neutral-500 font-poppins text-xs uppercase tracking-wider">
                  <th className="p-5 font-semibold">Staf & Email</th>
                  <th className="p-5 font-semibold">Tingkat Otoritas (Role)</th>
                  <th className="p-5 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {loading ? (
                  <tr>
                    <td colSpan="3" className="p-10 text-center text-neutral-500 font-medium">Memuat data staf...</td>
                  </tr>
                ) : (
                  users.map((item) => (
                    <tr key={item.id} className="hover:bg-[#FFF3F7]/30 transition-colors">
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#EC6BA5] to-[#D63384] text-white flex items-center justify-center font-bold font-poppins text-lg shadow-sm shrink-0">
                            {item.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-neutral-800 font-bold font-poppins text-sm flex items-center gap-2">
                              {item.name} {item.id === currentUser.id && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Anda</span>}
                            </span>
                            <span className="text-xs text-neutral-500 flex items-center gap-1.5 mt-1"><Mail className="w-3.5 h-3.5"/> {item.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${
                          item.role === 'superadmin' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                          item.role === 'owner' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          item.role === 'admin' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          item.role === 'logistik' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                          {item.role}
                        </span>
                      </td>
                      <td className="p-5">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleOpenModal(item)} className="p-2.5 bg-white border border-neutral-200 hover:border-[#F8B3CF] hover:bg-[#FFF3F7] text-neutral-500 hover:text-[#D63384] rounded-xl transition-all cursor-pointer shadow-sm" title="Edit Akun">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} disabled={item.id === currentUser.id} className="p-2.5 bg-white border border-neutral-200 hover:border-red-200 hover:bg-red-50 text-neutral-500 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer shadow-sm" title="Hapus Akun">
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
          MODAL: TAMBAH / EDIT AKUN
          ========================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-100 w-full max-w-md p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-neutral-100 pb-4">
              <h2 className="text-xl font-poppins font-bold text-neutral-800 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-[#EC6BA5]" /> {editId ? 'Edit Akses Pengguna' : 'Buat Akun Baru'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-neutral-400 hover:text-neutral-700 bg-neutral-50 hover:bg-neutral-100 p-2 rounded-full transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Nama Staf</label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-4 top-3.5 text-neutral-400" />
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 pl-12 pr-4 py-3.5 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-medium" placeholder="Contoh: Budi Santoso" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Email Login</label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-4 top-3.5 text-neutral-400" />
                  <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 pl-12 pr-4 py-3.5 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-medium" placeholder="budi@sesa.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Tingkat Otoritas (Role)</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3.5 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all cursor-pointer font-medium appearance-none">
                  <option value="kasir">Kasir (Buka POS, Pasien)</option>
                  <option value="logistik">Logistik (Atur Produk, Hutang PBF)</option>
                  <option value="admin">Admin (Akses Kasir & Laporan Dasar)</option>
                  <option value="owner">Owner (Akses Semua Kecuali Buat Akun)</option>
                  <option value="superadmin">Superadmin (Kendali Penuh Sistem)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">
                  {editId ? 'Ubah Password (Opsional)' : 'Password Login'}
                </label>
                <div className="relative">
                  <Key className="w-5 h-5 absolute left-4 top-3.5 text-neutral-400" />
                  <input type={editId ? "text" : "password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 pl-12 pr-4 py-3.5 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-medium placeholder:text-neutral-400" placeholder={editId ? "Ketik jika ingin mereset sandi..." : "Minimal 6 karakter"} />
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100 flex gap-3 mt-6">
                <button type="button" onClick={() => setModalOpen(false)} className="w-1/3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 py-4 rounded-xl font-poppins font-semibold transition-all cursor-pointer">
                  Batal
                </button>
                <button type="submit" disabled={processLoading} className="w-2/3 bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white py-4 rounded-xl font-poppins font-bold shadow-[0_4px_15px_rgba(214,51,132,0.25)] hover:shadow-[0_6px_20px_rgba(214,51,132,0.4)] transition-all cursor-pointer disabled:opacity-50 flex justify-center items-center gap-2">
                  {processLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}