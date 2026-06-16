import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Lock, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // ✅ SUDAH DIPERBAIKI: Menggunakan Backtick (`)
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, { 
        email, 
        password 
      });
      
      if (res.data.status === 'success') {
        login(res.data.data);
        navigate('/'); 
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Kredensial tidak valid atau server bermasalah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8F9FA] relative overflow-hidden font-inter">
      
      {/* Subtle Background Aesthetic Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#F8B3CF]/40 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#EC6BA5]/20 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Main Login Card */}
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative z-10 border border-neutral-100 animate-in zoom-in-95 duration-500">
        
        <div className="mb-10 text-center flex flex-col items-center">
          {/* Logo Asli Sesa Dermatology */}
          <img src="/Sesa.jpeg" alt="Sesa Dermatology Logo" className="w-40 h-auto mb-2 object-contain" />
          
          <div className="mt-4 inline-block bg-[#FFF3F7] text-[#D63384] px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide border border-[#F8B3CF]/30">
            SISTEM KASIR INTERNAL
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-500 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-neutral-600 mb-2 font-poppins">Email Akses</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-4 top-3.5 text-neutral-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-neutral-200 pl-12 pr-5 py-3.5 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 focus:ring-[#D63384]/20 transition-all font-medium placeholder:text-neutral-400 placeholder:font-normal"
                placeholder="admin@sesadermatology.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-600 mb-2 font-poppins">Kata Sandi</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-4 top-3.5 text-neutral-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-neutral-200 pl-12 pr-5 py-3.5 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 focus:ring-[#D63384]/20 transition-all font-medium placeholder:text-neutral-400 placeholder:font-normal"
                placeholder="Masukkan kata sandi..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white font-poppins font-bold py-4 px-4 rounded-full transition-all shadow-[0_4px_15px_rgba(214,51,132,0.25)] hover:shadow-[0_6px_20px_rgba(214,51,132,0.4)] disabled:opacity-50 disabled:shadow-none cursor-pointer flex justify-center items-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Memverifikasi...
              </>
            ) : 'Masuk ke Sistem'}
          </button>
        </form>
      </div>
    </div>
  );
}