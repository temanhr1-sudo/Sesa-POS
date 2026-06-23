import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { 
  ShoppingCart, 
  LayoutDashboard, 
  Package, 
  Users, 
  Wallet, 
  CreditCard, 
  Receipt, 
  LogOut,
  Clock,
  Shield // <-- Icon Baru untuk Kelola Akses
} from 'lucide-react';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Patients from './pages/Patients';
import POS from './pages/POS';
import Cashflow from './pages/Cashflow';
import Payables from './pages/Payables';
import Receivables from './pages/Receivables';
import ShiftHistory from './pages/ShiftHistory';
import UsersPage from './pages/Users'; // <-- Komponen Baru

// IMPORT INTEL BACKGROUND SYNC
import { useBackgroundSync } from './hooks/useBackgroundSync';

// ==========================================
// 1. KOMPONEN LAYOUT & SIDEBAR DINAMIS
// ==========================================
const Layout = ({ children }) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  // Definisi Akses Menu Berdasarkan Role
  const navLinks = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['superadmin', 'kasir', 'logistik', 'owner', 'admin'] },
    { path: '/pos', label: 'Kasir (POS)', icon: ShoppingCart, roles: ['superadmin', 'kasir', 'admin'] },
    { path: '/patients', label: 'Data Pasien', icon: Users, roles: ['superadmin', 'kasir', 'admin'] },
    { path: '/receivables', label: 'Piutang Pasien', icon: Receipt, roles: ['superadmin', 'kasir', 'owner', 'admin'] },
    
    { path: '/products', label: 'Master Produk', icon: Package, roles: ['superadmin', 'logistik', 'owner'] },
    { path: '/payables', label: 'Hutang Klinik', icon: CreditCard, roles: ['superadmin', 'logistik', 'owner'] },
    
    { path: '/cashflow', label: 'Pembukuan Kas', icon: Wallet, roles: ['superadmin', 'owner', 'admin'] },
    { path: '/shifts', label: 'Audit Shift', icon: Clock, roles: ['superadmin', 'owner', 'admin'] },
    
    { path: '/users', label: 'Kelola Akses', icon: Shield, roles: ['superadmin'] }, // <-- Menu Eksklusif Superadmin
  ];

  const authorizedLinks = navLinks.filter(link => link.roles.includes(user?.role));

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-neutral-800 flex font-inter font-sans">
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@500;600;700&display=swap');
        .font-poppins { font-family: 'Poppins', sans-serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
        body { background-color: #F8F9FA; }
        
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #D63384; }
      `}</style>

      {/* SIDEBAR */}
      <aside className="w-[260px] bg-white border-r border-neutral-100 flex flex-col z-20 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] print:hidden">
        
        <div className="p-6 border-b border-neutral-50 flex items-center gap-3.5">
          <img src="/Sesa.jpeg" alt="Logo Sesa" className="w-14 h-14 object-contain rounded-md" />
          <div className="flex flex-col">
            <h2 className="text-2xl font-poppins font-bold text-neutral-800 tracking-tight leading-none mb-1">sesa</h2>
            <p className="text-xs text-[#D63384] uppercase tracking-widest font-medium leading-none">Dermatology</p>
          </div>
        </div>

        <nav className="flex-1 py-6 flex flex-col gap-1.5 overflow-y-auto">
          {authorizedLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;
            
            return (
              <Link 
                key={link.path} 
                to={link.path} 
                className={`mx-4 px-4 py-3 rounded-xl flex items-center gap-3 text-sm transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#EC6BA5] to-[#D63384] text-white font-medium shadow-[0_4px_12px_rgba(214,51,132,0.25)]' 
                    : 'text-neutral-500 font-medium hover:bg-[#FFF3F7] hover:text-[#D63384]'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-neutral-400 group-hover:text-[#D63384]'}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-50">
          <div className="px-4 py-3 mb-2 bg-[#F8F9FA] rounded-xl flex flex-col">
            <span className="text-xs text-neutral-400 font-medium">Login sebagai:</span>
            <span className="text-sm font-bold text-neutral-800 capitalize">{user?.role || 'User'}</span>
          </div>
          <button 
            onClick={logout} 
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Logout / Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative h-screen">
        <div className="absolute inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:40px_40px] print:hidden"></div>
        <div className="relative z-10 h-full">
          {children}
        </div>
      </main>
    </div>
  );
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    if (user?.role === 'kasir') return <Navigate to="/pos" replace />;
    if (user?.role === 'logistik') return <Navigate to="/products" replace />;
    return <Navigate to="/" replace />;
  }
  return <Layout>{children}</Layout>;
};

function App() {
  const { token } = useAuthStore();
  
  // MENGAKTIFKAN INTEL BACKGROUND SYNC
  useBackgroundSync(); 

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
        
        <Route path="/" element={<ProtectedRoute allowedRoles={['superadmin', 'kasir', 'logistik', 'owner', 'admin']}><Dashboard /></ProtectedRoute>} />
        <Route path="/pos" element={<ProtectedRoute allowedRoles={['superadmin', 'kasir', 'admin']}><POS /></ProtectedRoute>} />
        <Route path="/patients" element={<ProtectedRoute allowedRoles={['superadmin', 'kasir', 'admin']}><Patients /></ProtectedRoute>} />
        <Route path="/receivables" element={<ProtectedRoute allowedRoles={['superadmin', 'kasir', 'owner', 'admin']}><Receivables /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute allowedRoles={['superadmin', 'logistik', 'owner']}><Products /></ProtectedRoute>} />
        <Route path="/payables" element={<ProtectedRoute allowedRoles={['superadmin', 'logistik', 'owner']}><Payables /></ProtectedRoute>} />
        <Route path="/cashflow" element={<ProtectedRoute allowedRoles={['superadmin', 'owner', 'admin']}><Cashflow /></ProtectedRoute>} />
        <Route path="/shifts" element={<ProtectedRoute allowedRoles={['superadmin', 'owner', 'admin']}><ShiftHistory /></ProtectedRoute>} />
        
        {/* Rute Sangat Rahasia (Hanya Superadmin) */}
        <Route path="/users" element={<ProtectedRoute allowedRoles={['superadmin']}><UsersPage /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;