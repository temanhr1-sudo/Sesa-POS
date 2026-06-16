import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { LayoutDashboard, TrendingUp, AlertTriangle, CreditCard, FileText, ShoppingCart, ArrowRight, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { token, user } = useAuthStore();
  const [stats, setStats] = useState({
    today_transactions: 0,
    today_revenue: 0,
    low_stock_products: [],
    unpaid_payables: 0,
    unpaid_receivables: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        // ✅ API Call sudah menggunakan template literal (backtick) yang benar
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data.data);
      } catch (err) {
        console.error('Gagal mengambil data dashboard', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [token]);

  return (
    <div className="p-8 lg:p-10 font-inter">
      
      {/* HEADER SECTION */}
      <div className="mb-10">
        <h1 className="text-3xl font-poppins font-bold text-neutral-800 flex items-center gap-3 tracking-tight">
          <div className="p-2.5 bg-[#FFF3F7] rounded-xl">
            <LayoutDashboard className="w-7 h-7 text-[#D63384]" />
          </div>
          Dashboard Utama
        </h1>
        <p className="text-neutral-500 text-base mt-2 ml-14">Selamat datang kembali, <span className="font-semibold text-neutral-700">{user?.name}</span>. Berikut ringkasan sistem Sesa hari ini.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
           <div className="w-10 h-10 border-4 border-neutral-100 border-t-[#D63384] rounded-full animate-spin"></div>
           <p className="text-neutral-500 font-medium">Menyinkronkan data klinik...</p>
        </div>
      ) : (
        <>
          {/* BARIS ATAS: KARTU METRIK UTAMA */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            
            {/* Card 1: Pendapatan */}
            <div className="bg-white border border-neutral-100 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden group hover:shadow-[0_8px_30px_rgba(214,51,132,0.08)] transition-all">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-neutral-500 text-sm font-medium">Pendapatan Hari Ini</h3>
                <div className="p-2.5 bg-[#FFF3F7] rounded-xl text-[#D63384] group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-poppins font-bold text-neutral-800 tracking-tight">
                Rp {stats.today_revenue.toLocaleString('id-ID')}
              </p>
            </div>
            
            {/* Card 2: Transaksi */}
            <div className="bg-white border border-neutral-100 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden group hover:shadow-[0_8px_30px_rgba(214,51,132,0.08)] transition-all">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-neutral-500 text-sm font-medium">Transaksi Kasir</h3>
                <div className="p-2.5 bg-[#FFF3F7] rounded-xl text-[#D63384] group-hover:scale-110 transition-transform">
                  <ShoppingCart className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-poppins font-bold text-neutral-800 tracking-tight">
                {stats.today_transactions} <span className="text-base font-inter font-medium text-neutral-400">struk</span>
              </p>
            </div>

            {/* Card 3: Piutang */}
            <div className="bg-white border border-neutral-100 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden group hover:shadow-[0_8px_30px_rgba(16,185,129,0.08)] transition-all">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-neutral-500 text-sm font-medium">Piutang Pasien</h3>
                <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-poppins font-bold text-emerald-500 tracking-tight">
                  Rp {stats.unpaid_receivables.toLocaleString('id-ID')}
                </p>
                <p className="text-xs text-neutral-400 mt-1">Belum dilunasi</p>
              </div>
            </div>

            {/* Card 4: Hutang */}
            <div className="bg-white border border-neutral-100 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden group hover:shadow-[0_8px_30px_rgba(244,63,94,0.08)] transition-all">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-neutral-500 text-sm font-medium">Hutang Klinik (PBF)</h3>
                <div className="p-2.5 bg-rose-50 rounded-xl text-rose-500 group-hover:scale-110 transition-transform">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-poppins font-bold text-rose-500 tracking-tight">
                  Rp {stats.unpaid_payables.toLocaleString('id-ID')}
                </p>
                <p className="text-xs text-neutral-400 mt-1">Tagihan aktif</p>
              </div>
            </div>
          </div>

          {/* BARIS BAWAH: PERINGATAN & JALAN PINTAS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Panel Stok Menipis */}
            <div className="bg-white border border-neutral-100 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col overflow-hidden">
              <div className="p-6 border-b border-neutral-100 flex items-center gap-3 bg-white">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="text-neutral-800 font-poppins font-bold text-lg">Peringatan Stok Menipis</h3>
              </div>
              
              <div className="flex-1 bg-[#FAFAFA]">
                {stats.low_stock_products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-neutral-400">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                      <CheckCircle className="w-8 h-8 text-emerald-400" />
                    </div>
                    <p className="font-medium">Semua stok produk dalam kondisi aman.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-neutral-100">
                    {stats.low_stock_products.map(product => (
                      <li key={product.id} className="flex justify-between items-center p-5 bg-white hover:bg-[#FFF3F7]/30 transition-colors">
                        <div className="flex flex-col">
                          <p className="text-neutral-800 text-sm font-poppins font-semibold">{product.name}</p>
                          <p className="text-xs text-neutral-400 font-mono mt-0.5">{product.sku}</p>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-rose-500 font-poppins font-bold text-base">{product.stock} <span className="text-xs font-inter font-normal">tersisa</span></p>
                            <p className="text-xs text-neutral-400">Min: {product.min_stock}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <div className="p-4 bg-white border-t border-neutral-100 text-center">
                <Link to="/products" className="text-[#D63384] text-sm font-semibold hover:text-[#8A1E4D] flex items-center justify-center gap-2 group">
                  Kelola Master Produk <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Panel Aksi Cepat */}
            <div className="bg-white border border-neutral-100 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col overflow-hidden">
              <div className="p-6 border-b border-neutral-100">
                <h3 className="text-neutral-800 font-poppins font-bold text-lg">Aksi Cepat</h3>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4 flex-1 bg-[#FAFAFA]">
                
                <Link to="/pos" className="bg-white border border-neutral-100 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-[#F8B3CF] hover:shadow-[0_8px_20px_rgba(214,51,132,0.1)] transition-all cursor-pointer group">
                  <div className="p-4 bg-[#FFF3F7] rounded-full group-hover:bg-gradient-to-br group-hover:from-[#EC6BA5] group-hover:to-[#D63384] transition-all duration-300">
                    <ShoppingCart className="w-7 h-7 text-[#D63384] group-hover:text-white" />
                  </div>
                  <span className="text-sm font-semibold text-neutral-600 group-hover:text-[#D63384]">Buka Kasir POS</span>
                </Link>

                <Link to="/patients" className="bg-white border border-neutral-100 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-[#F8B3CF] hover:shadow-[0_8px_20px_rgba(214,51,132,0.1)] transition-all cursor-pointer group">
                  <div className="p-4 bg-[#FFF3F7] rounded-full group-hover:bg-gradient-to-br group-hover:from-[#EC6BA5] group-hover:to-[#D63384] transition-all duration-300">
                    <FileText className="w-7 h-7 text-[#D63384] group-hover:text-white" />
                  </div>
                  <span className="text-sm font-semibold text-neutral-600 group-hover:text-[#D63384]">Daftar Pasien</span>
                </Link>

                {user?.role === 'admin' && (
                  <>
                    <Link to="/cashflow" className="bg-white border border-neutral-100 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-[#F8B3CF] hover:shadow-[0_8px_20px_rgba(214,51,132,0.1)] transition-all cursor-pointer group">
                      <div className="p-4 bg-[#FFF3F7] rounded-full group-hover:bg-gradient-to-br group-hover:from-[#EC6BA5] group-hover:to-[#D63384] transition-all duration-300">
                        <TrendingUp className="w-7 h-7 text-[#D63384] group-hover:text-white" />
                      </div>
                      <span className="text-sm font-semibold text-neutral-600 group-hover:text-[#D63384]">Catat Pengeluaran</span>
                    </Link>

                    <Link to="/payables" className="bg-white border border-neutral-100 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-[#F8B3CF] hover:shadow-[0_8px_20px_rgba(214,51,132,0.1)] transition-all cursor-pointer group">
                      <div className="p-4 bg-[#FFF3F7] rounded-full group-hover:bg-gradient-to-br group-hover:from-[#EC6BA5] group-hover:to-[#D63384] transition-all duration-300">
                        <CreditCard className="w-7 h-7 text-[#D63384] group-hover:text-white" />
                      </div>
                      <span className="text-sm font-semibold text-neutral-600 group-hover:text-[#D63384]">Bayar PBF</span>
                    </Link>
                  </>
                )}

              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}