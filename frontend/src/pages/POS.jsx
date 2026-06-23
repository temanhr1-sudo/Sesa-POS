import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { 
  ShoppingCart, Search, ScanLine, X, Plus, Minus, CreditCard, 
  CheckCircle, User, Printer, Lock, Unlock, Clock, UserPlus, WifiOff 
} from 'lucide-react';
// IMPORT FUNGSI BRANKAS LOKAL
import { saveMasterData, getMasterData, addTransactionToQueue } from '../utils/offlineDB';

export default function POS() {
  const { token, user } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [patients, setPatients] = useState([]);
  
  // === STATE SENSOR OFFLINE ===
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Semua');
  const [manualBarcode, setManualBarcode] = useState('');
  
  const [cart, setCart] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [discount, setDiscount] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [receiptModal, setReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  
  const [paymentMethod, setPaymentMethod] = useState('tunai');
  const [paidAmount, setPaidAmount] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // === STATE UNTUK MANAJEMEN SHIFT ===
  const [activeShift, setActiveShift] = useState(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [startingCash, setStartingCash] = useState('');
  const [actualCash, setActualCash] = useState('');
  const [showCloseShift, setShowCloseShift] = useState(false);

  // === STATE UNTUK JALAN PINTAS TAMBAH MEMBER ===
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [patientLoading, setPatientLoading] = useState(false);
  const [newPatientData, setNewPatientData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gender: 'P'
  });

  // === REF UNTUK AUTO-FOCUS (KASIR SUPER CEPAT) ===
  const barcodeInputRef = useRef(null);
  const paidAmountRef = useRef(null);
  const printBtnRef = useRef(null);

  // === EVENT LISTENER INTERNET ===
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // === EVENT LISTENER UNTUK TOMBOL ESCAPE ===
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && receiptModal) {
        closeReceiptModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [receiptModal]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setShiftLoading(true);
        if (!navigator.onLine) throw new Error('Offline mode');

        const shiftRes = await axios.get(`${import.meta.env.VITE_API_URL}/shifts/active`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        setActiveShift(shiftRes.data.data);
        await saveMasterData('active_shift', shiftRes.data.data);

        setLoading(true);
        const [resProducts, resPatients] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/products`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${import.meta.env.VITE_API_URL}/patients`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setProducts(resProducts.data.data);
        setPatients(resPatients.data.data);

        await saveMasterData('products', resProducts.data.data);
        await saveMasterData('patients', resPatients.data.data);

      } catch (err) {
        console.warn('Gagal koneksi ke server, beralih ke Mode Offline...', err);
        const localShift = await getMasterData('active_shift');
        const localProducts = await getMasterData('products');
        const localPatients = await getMasterData('patients');

        if (localShift) setActiveShift(localShift);
        if (localProducts) setProducts(localProducts);
        if (localPatients) setPatients(localPatients);
      } finally {
        setShiftLoading(false);
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [token, isOffline]); 

  // Auto-focus Barcode
  useEffect(() => {
    if (activeShift && !checkoutModal && !receiptModal && !showAddPatientModal) {
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    }
  }, [activeShift, checkoutModal, receiptModal, showAddPatientModal]);

  // Auto-focus Input Nominal Uang saat Checkout dibuka
  useEffect(() => {
    if (checkoutModal && paymentMethod === 'tunai') {
      setTimeout(() => paidAmountRef.current?.focus(), 100);
    }
  }, [checkoutModal, paymentMethod]);

  // Auto-focus Tombol Cetak Struk saat Receipt dibuka
  useEffect(() => {
    if (receiptModal) {
      setTimeout(() => printBtnRef.current?.focus(), 100);
    }
  }, [receiptModal]);

  const handleOpenShift = async (e) => {
    e.preventDefault();
    if (isOffline) return alert('Buka shift harus dalam keadaan Online (Internet menyala).');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/shifts/open`, 
        { starting_cash: Number(startingCash) }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const shiftRes = await axios.get(`${import.meta.env.VITE_API_URL}/shifts/active`, { headers: { Authorization: `Bearer ${token}` } });
      setActiveShift(shiftRes.data.data);
      await saveMasterData('active_shift', shiftRes.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuka shift kasir');
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (isOffline) return alert('Tutup shift harus dalam keadaan Online agar data terekam.');
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/shifts/close`, 
        { actual_cash: Number(actualCash) }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const closedData = res.data.data;
      const selisih = Number(closedData.actual_cash) - Number(closedData.expected_cash);
      
      alert(`Shift berhasil ditutup!\n\nUang Seharusnya: Rp ${Number(closedData.expected_cash).toLocaleString('id-ID')}\nUang Fisik: Rp ${Number(closedData.actual_cash).toLocaleString('id-ID')}\nSelisih: Rp ${selisih.toLocaleString('id-ID')}`);
      
      setActiveShift(null);
      setShowCloseShift(false);
      setActualCash('');
      setStartingCash('');
      await saveMasterData('active_shift', null);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menutup shift');
    }
  };

  const handleAddPatientSubmit = async (e) => {
    e.preventDefault();
    if (isOffline) return alert('Tidak bisa menambah member saat Offline.');
    try {
      setPatientLoading(true);
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/patients`, newPatientData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const resPatients = await axios.get(`${import.meta.env.VITE_API_URL}/patients`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setPatients(resPatients.data.data);
      await saveMasterData('patients', resPatients.data.data); 
      
      const createdPatient = res.data.data;
      if (createdPatient && createdPatient.id) {
        setSelectedPatient(createdPatient.id);
      }

      setShowAddPatientModal(false);
      setNewPatientData({ name: '', phone: '', email: '', address: '', gender: 'P' });
      alert('Member baru berhasil didaftarkan!');
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambahkan member baru');
    } finally {
      setPatientLoading(false);
    }
  };

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.log('Audio tidak didukung');
    }
  };

  const handleScan = (scannedBarcode) => {
    if (!scannedBarcode) return;
    const foundProduct = products.find(p => p.barcode === scannedBarcode || p.sku === scannedBarcode);
    if (foundProduct) {
      playBeep();
      addToCart(foundProduct);
    } else {
      alert(`Produk dengan barcode/SKU "${scannedBarcode}" tidak ditemukan.`);
    }
  };

  const handleManualBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!manualBarcode.trim()) {
      if (cart.length > 0 && activeShift) {
        setCheckoutModal(true);
      }
      return;
    }

    handleScan(manualBarcode);
    setManualBarcode(''); 
    if (barcodeInputRef.current) barcodeInputRef.current.focus(); 
  };

  const addToCart = (product) => {
    if (!product.is_service && product.stock <= 0) {
      alert('Stok produk habis!');
      return;
    }
    setCart((prev) => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (!product.is_service && existing.qty >= product.stock) {
          alert('Mencapai batas maksimal stok');
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, change) => {
    setCart((prev) => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + change;
        if (newQty < 1) return item;
        if (!item.is_service && newQty > item.stock) return item;
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter(item => item.id !== id));

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.sell_price) * item.qty), 0);
  const total = subtotal - Number(discount);

  const calculatedPaidAmount = paidAmount === '' ? total : Number(paidAmount);
  const kembalian = paymentMethod === 'tunai' ? calculatedPaidAmount - total : 0;

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'Semua' || p.category === category;
    return matchSearch && matchCat;
  });

  const handleCheckout = async (e) => {
    if (e) e.preventDefault(); 
    if (cart.length === 0) return alert('Keranjang kosong!');
    if (paymentMethod === 'tunai' && calculatedPaidAmount < total) return alert('Nominal bayar kurang!');

    try {
      setCheckoutLoading(true);
      const payload = {
        shift_id: activeShift.id, 
        patient_id: selectedPatient || null,
        subtotal: subtotal,
        discount: Number(discount),
        total: total,
        payment_method: paymentMethod,
        paid_amount: paymentMethod === 'tunai' ? calculatedPaidAmount : total,
        items: cart.map(item => ({
          product_id: item.id,
          name: item.name,
          qty: item.qty,
          sell_price: item.sell_price,
          is_service: item.is_service
        }))
      };

      let txCode = '';

      if (isOffline) {
        await addTransactionToQueue(payload);
        txCode = `OFF-${Date.now().toString().slice(-6)}`;
      } else {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/transactions`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        txCode = res.data.data.tx_code;
      }

      const patientInfo = patients.find(p => p.id === selectedPatient);

      setReceiptData(null); 
      
      setTimeout(() => {
        setReceiptData({
          tx_code: txCode,
          date: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
          cashier: user?.name,
          patient: patientInfo ? patientInfo.name : 'Umum',
          items: [...cart],
          subtotal: subtotal,
          discount: Number(discount),
          total: total,
          paymentMethod: paymentMethod,
          paidAmount: paymentMethod === 'tunai' ? calculatedPaidAmount : total,
          kembalian: kembalian
        });
        
        setCart([]);
        setSelectedPatient('');
        setDiscount(0);
        setPaidAmount('');
        setCheckoutModal(false);
        setReceiptModal(true); 
        
        setProducts(products.map(p => {
          const cartItem = cart.find(c => c.id === p.id);
          if (cartItem && !p.is_service) {
            return { ...p, stock: p.stock - cartItem.qty };
          }
          return p;
        }));
      }, 50);

    } catch (err) {
      if (!navigator.onLine || err.message === 'Network Error') {
        alert('Koneksi terputus saat proses. Transaksi disimpan di Antrean Lokal.');
        setIsOffline(true);
      } else {
        alert(err.response?.data?.message || 'Gagal memproses transaksi');
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  const executePrint = () => window.print();

  const closeReceiptModal = () => {
    setReceiptModal(false);
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  };

  if (shiftLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8F9FA]">
        <div className="w-10 h-10 border-4 border-neutral-200 border-t-[#D63384] rounded-full animate-spin"></div>
        <p className="mt-4 text-neutral-500 font-medium">Menghubungkan ke sistem shift...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen lg:h-[calc(100vh-4rem)] overflow-hidden bg-[#F8F9FA] font-inter relative print:bg-white print:overflow-visible">
      
      {/* ====================================================
          LAYAR KUNCI: JIKA BELUM BUKA SHIFT
          ==================================================== */}
      {!activeShift && (
        <div className="absolute inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 print:hidden">
          <div className="bg-white border border-neutral-100 p-10 rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-500 text-center">
            <div className="w-20 h-20 bg-[#FFF3F7] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
               <Lock className="w-10 h-10 text-[#D63384]" />
            </div>
            <h2 className="text-2xl font-poppins font-bold text-neutral-800 mb-2">Kasir Terkunci</h2>
            <p className="text-neutral-500 text-sm mb-8">Silakan buka shift dengan memasukkan jumlah modal awal (uang kembalian) yang ada di laci saat ini.</p>
            
            <form onSubmit={handleOpenShift}>
              <div className="text-left mb-8">
                <label className="block text-sm font-semibold text-neutral-600 mb-2 font-poppins">Modal Awal Laci (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-neutral-400 font-bold">Rp</span>
                  <input 
                    type="number" 
                    required 
                    value={startingCash}
                    onChange={(e) => setStartingCash(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-neutral-200 pl-12 pr-4 py-3.5 rounded-xl text-neutral-900 text-xl font-bold focus:outline-none focus:border-[#D63384] focus:ring-2 focus:ring-[#D63384]/20 transition-all font-mono"
                    placeholder="0"
                  />
                </div>
              </div>
              <button type="submit" disabled={isOffline} className="w-full bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white py-4 rounded-xl font-poppins font-bold flex justify-center items-center gap-2 shadow-[0_4px_15px_rgba(214,51,132,0.25)] hover:shadow-[0_6px_20px_rgba(214,51,132,0.4)] disabled:opacity-50 transition-all cursor-pointer">
                <Unlock className="w-5 h-5" /> {isOffline ? 'TIDAK ADA INTERNET' : 'BUKA SHIFT SEKARANG'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL TUTUP SHIFT
          ==================================================== */}
      {showCloseShift && activeShift && (
        <div className="absolute inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 print:hidden">
          <div className="bg-white border border-neutral-100 p-8 rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-poppins font-bold text-neutral-800 flex items-center gap-2">
                <Clock className="w-6 h-6 text-[#EC6BA5]" /> Tutup Shift
              </h2>
              <button onClick={() => setShowCloseShift(false)} className="text-neutral-400 hover:text-neutral-700 bg-neutral-50 hover:bg-neutral-100 p-2 rounded-full transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            <p className="text-neutral-500 text-sm mb-6">Hitung seluruh uang tunai fisik yang ada di laci kasir saat ini, lalu masukkan nominalnya di bawah.</p>
            
            <form onSubmit={handleCloseShift}>
              <div className="text-left mb-8">
                <label className="block text-sm font-semibold text-neutral-600 mb-2 font-poppins">Total Uang Fisik (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-neutral-400 font-bold">Rp</span>
                  <input 
                    type="number" 
                    required 
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-neutral-200 pl-12 pr-4 py-3.5 rounded-xl text-neutral-900 text-xl font-bold focus:outline-none focus:border-[#D63384] focus:ring-2 focus:ring-[#D63384]/20 transition-all font-mono"
                    placeholder="0"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-neutral-800 hover:bg-black text-white py-4 rounded-xl font-poppins font-bold shadow-md transition-all cursor-pointer">
                KONFIRMASI TUTUP SHIFT
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL JALAN PINTAS TAMBAH MEMBER
          ==================================================== */}
      {showAddPatientModal && (
        <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-white border border-neutral-100 w-full max-w-md p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-neutral-100 pb-4">
              <h2 className="text-xl font-poppins font-bold text-neutral-800 flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-[#EC6BA5]" /> Daftar Member Baru
              </h2>
              <button onClick={() => setShowAddPatientModal(false)} className="text-neutral-400 hover:text-neutral-700 bg-neutral-50 hover:bg-neutral-100 p-2 rounded-full transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleAddPatientSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Nama Lengkap</label>
                <input type="text" required value={newPatientData.name} onChange={e => setNewPatientData({...newPatientData, name: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 focus:ring-[#D63384]/20 transition-all placeholder:text-neutral-400 font-medium" placeholder="Contoh: Sarah Azhari" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Nomor Telepon</label>
                  <input type="text" required value={newPatientData.phone} onChange={e => setNewPatientData({...newPatientData, phone: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 focus:ring-[#D63384]/20 transition-all placeholder:text-neutral-400 font-medium" placeholder="0812..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Jenis Kelamin</label>
                  <select 
                    required 
                    value={newPatientData.gender} 
                    onChange={e => setNewPatientData({...newPatientData, gender: e.target.value})} 
                    className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 focus:ring-[#D63384]/20 transition-all cursor-pointer appearance-none font-medium"
                  >
                    <option value="P">Perempuan</option>
                    <option value="L">Laki-Laki</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Email (Opsional)</label>
                <input type="email" value={newPatientData.email} onChange={e => setNewPatientData({...newPatientData, email: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 focus:ring-[#D63384]/20 transition-all placeholder:text-neutral-400 font-medium" placeholder="sarah@email.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Alamat Rumah</label>
                <textarea 
                  rows="2"
                  value={newPatientData.address} 
                  onChange={e => setNewPatientData({...newPatientData, address: e.target.value})} 
                  className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 focus:ring-[#D63384]/20 transition-all placeholder:text-neutral-400 font-medium text-sm resize-none" 
                  placeholder="Nama jalan, nomor rumah, RT/RW, kota..."
                />
              </div>
              
              <div className="pt-4">
                <button type="submit" disabled={patientLoading || isOffline} className="w-full bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white py-3.5 rounded-xl font-poppins font-bold shadow-[0_4px_15px_rgba(214,51,132,0.25)] hover:shadow-[0_6px_20px_rgba(214,51,132,0.4)] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center">
                  {patientLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Simpan Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT FONTS & CSS KHUSUS PRINTER THERMAL */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@500;600;700&display=swap');
        .font-poppins { font-family: 'Poppins', sans-serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #D63384; }

        @media print {
          @page { margin: 0; size: 58mm auto; }
          body, html { background: white !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
          .print\\:hidden, aside, nav, .no-print { display: none !important; }
          #root, .min-h-screen, main { display: block !important; height: auto !important; min-height: 0 !important; overflow: visible !important; position: static !important; }
          #print-area { display: block !important; }
        }
      `}</style>

      {/* BAGIAN KIRI: Panel Produk & Scanner Barcode Fisik */}
      <div className="w-full lg:w-2/3 flex flex-col h-full border-r border-neutral-100 bg-white relative p-4 lg:p-6 print:hidden z-10 shadow-[4px_0_24px_rgba(0,0,0,0.01)]">
        
        {/* BANNER OFFLINE MODE */}
        {isOffline && (
          <div className="absolute top-0 left-0 right-0 bg-rose-500 text-white text-xs font-bold py-1.5 flex items-center justify-center gap-2 z-50 animate-in slide-in-from-top">
            <WifiOff className="w-3.5 h-3.5" /> INTERNET TERPUTUS - APLIKASI BERJALAN PADA MODE OFFLINE
          </div>
        )}

        <div className={`mb-6 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center ${isOffline ? 'mt-4' : ''}`}>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-poppins font-bold text-neutral-800 flex items-center gap-2 tracking-tight">
                <div className="p-2 bg-[#FFF3F7] rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-[#D63384]" />
                </div>
                Kasir POS
              </h1>
              {activeShift && (
                <button 
                  onClick={() => setShowCloseShift(true)}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-600 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" /> Tutup Shift
                </button>
              )}
            </div>
            <p className="text-neutral-500 text-sm mt-1 ml-11">Kasir aktif: <span className="text-neutral-700 font-semibold">{user?.name}</span></p>
          </div>
          
          <div className="flex flex-wrap md:flex-nowrap gap-3 w-full xl:w-auto">
            <form onSubmit={handleManualBarcodeSubmit} className="flex relative flex-1 min-w-[250px] group">
              <ScanLine className="w-5 h-5 absolute left-4 top-3 text-[#D63384] group-focus-within:animate-pulse" />
              <input 
                ref={barcodeInputRef}
                type="text" 
                placeholder="[ SCAN BARCODE DISINI ]" 
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-neutral-200 pl-12 pr-4 py-2.5 rounded-xl text-neutral-800 font-mono focus:border-[#D63384] focus:ring-2 focus:ring-[#D63384]/20 focus:outline-none placeholder:text-neutral-400 transition-all shadow-sm"
              />
              <button type="submit" className="hidden">Submit</button>
            </form>

            <div className="relative flex-1 min-w-[150px]">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Cari produk..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-neutral-200 pl-11 pr-4 py-2.5 rounded-xl text-neutral-800 focus:border-[#D63384] focus:ring-2 focus:ring-[#D63384]/20 focus:outline-none transition-all placeholder:text-neutral-400"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {['Semua', 'skincare', 'obat', 'layanan', 'alkes'].map(cat => (
            <button 
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-5 py-2 text-sm font-semibold capitalize whitespace-nowrap rounded-full transition-all cursor-pointer ${
                category === cat 
                ? 'bg-gradient-to-r from-[#EC6BA5] to-[#D63384] text-white shadow-[0_4px_12px_rgba(214,51,132,0.3)] border-transparent' 
                : 'bg-white text-neutral-500 border border-neutral-200 hover:text-[#D63384] hover:bg-[#FFF3F7] hover:border-[#F8B3CF]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
               <div className="w-8 h-8 border-4 border-neutral-100 border-t-[#D63384] rounded-full animate-spin"></div>
               <p className="text-neutral-500 font-medium text-sm">Memuat produk katalog...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <div 
                  key={product.id} 
                  onClick={() => addToCart(product)}
                  className={`bg-white border ${(!product.is_service && product.stock <= 0) ? 'border-red-200 opacity-50 bg-red-50/30 cursor-not-allowed' : 'border-neutral-200 hover:border-[#D63384] hover:shadow-[0_8px_20px_rgba(214,51,132,0.08)] hover:-translate-y-0.5 cursor-pointer'} p-4 flex flex-col justify-between transition-all duration-300 rounded-2xl h-36 relative overflow-hidden`}
                >
                  <div>
                    <span className="text-[10px] bg-[#F8F9FA] text-neutral-500 px-2 py-1 rounded-md uppercase font-mono font-semibold tracking-wider border border-neutral-100">{product.sku}</span>
                    <h3 className="text-sm font-poppins font-semibold text-neutral-800 line-clamp-2 leading-snug mt-3">{product.name}</h3>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <p className="text-[#D63384] font-poppins font-bold text-sm tracking-tight">Rp {Number(product.sell_price).toLocaleString('id-ID')}</p>
                    <p className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${product.is_service ? 'bg-[#FFF3F7] text-[#D63384]' : 'bg-neutral-100 text-neutral-500'}`}>
                      {product.is_service ? 'JASA' : `Stok ${product.stock}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BAGIAN KANAN: Panel Keranjang & Checkout */}
      <div className="w-full lg:w-1/3 bg-[#F8F9FA] flex flex-col h-full z-0 print:hidden border-l border-neutral-100 relative">
        <div className="p-5 border-b border-neutral-200 bg-white shadow-sm">
          <h2 className="text-lg font-poppins font-bold text-neutral-800 mb-4 flex items-center gap-2">Detail Transaksi</h2>
          
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-3 bg-[#F8F9FA] border border-neutral-200 p-3 rounded-xl focus-within:border-[#D63384] focus-within:ring-2 focus-within:ring-[#D63384]/20 transition-all">
              <User className="w-5 h-5 text-[#D63384]" />
              <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} className="w-full bg-transparent text-sm font-medium text-neutral-700 focus:outline-none cursor-pointer appearance-none">
                <option value="">-- Pasien Umum (Non-Member) --</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.patient_code})</option>)}
              </select>
            </div>
            
            <button 
              onClick={() => setShowAddPatientModal(true)}
              disabled={isOffline}
              title={isOffline ? "Fitur dinonaktifkan saat offline" : "Daftarkan Member Baru"}
              className="p-3 bg-gradient-to-br from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white rounded-xl shadow-[0_4px_10px_rgba(214,51,132,0.2)] disabled:opacity-50 transition-all cursor-pointer flex-shrink-0"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#F8F9FA]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-4">
              <div className="w-16 h-16 bg-white border border-neutral-200 rounded-full flex items-center justify-center shadow-sm">
                <ShoppingCart className="w-7 h-7 text-neutral-300" />
              </div>
              <p className="font-medium text-sm">Keranjang belanja kosong</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-white border border-neutral-200 p-4 rounded-2xl shadow-sm hover:border-[#F8B3CF] transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-sm text-neutral-800 font-poppins font-semibold pr-4 leading-snug">{item.name}</h4>
                  <button onClick={() => removeFromCart(item.id)} className="text-neutral-400 hover:text-red-500 bg-neutral-50 hover:bg-red-50 p-1.5 rounded-full transition-colors cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[#EC6BA5] font-poppins font-bold text-sm tracking-tight">Rp {Number(item.sell_price).toLocaleString('id-ID')}</p>
                  <div className="flex items-center gap-3 bg-[#F8F9FA] border border-neutral-200 rounded-xl px-1.5 py-1.5">
                    <button onClick={() => updateQty(item.id, -1)} className="p-1.5 text-neutral-500 hover:text-[#D63384] hover:bg-white rounded-lg transition-colors cursor-pointer shadow-sm"><Minus className="w-3 h-3" /></button>
                    <span className="text-sm font-bold text-neutral-800 w-5 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="p-1.5 text-neutral-500 hover:text-[#D63384] hover:bg-white rounded-lg transition-colors cursor-pointer shadow-sm"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-neutral-200 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.02)] z-20">
          <div className="flex justify-between items-center mb-3 text-sm">
            <span className="text-neutral-500 font-medium">Subtotal</span>
            <span className="text-neutral-800 font-semibold">Rp {subtotal.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between items-center mb-5 text-sm border-b border-neutral-100 pb-5">
            <span className="text-neutral-500 font-medium">Potongan Diskon (Rp)</span>
            <div className="relative">
               <span className="absolute left-3 top-2 text-neutral-400 font-medium">Rp</span>
               <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-32 bg-[#F8F9FA] border border-neutral-200 text-right pl-8 pr-3 py-2 rounded-xl text-[#D63384] font-bold focus:outline-none focus:border-[#D63384] focus:ring-2 focus:ring-[#D63384]/20 transition-all" placeholder="0" />
            </div>
          </div>
          <div className="flex justify-between items-end mb-6">
            <span className="text-base font-poppins font-medium text-neutral-500">Total Tagihan</span>
            <span className="text-3xl font-poppins font-bold text-neutral-900 tracking-tight">Rp {total.toLocaleString('id-ID')}</span>
          </div>
          <button 
            onClick={() => setCheckoutModal(true)}
            disabled={cart.length === 0 || !activeShift}
            className="w-full bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white py-4 rounded-full font-poppins font-bold text-base shadow-[0_4px_15px_rgba(214,51,132,0.25)] hover:shadow-[0_6px_20px_rgba(214,51,132,0.4)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            LANJUT PEMBAYARAN <CreditCard className="w-5 h-5 ml-1" />
          </button>
        </div>
      </div>

      {/* Modal Checkout - DIBUNGKUS DALAM FORM AGAR BISA TEKAN ENTER */}
      {checkoutModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-white border border-neutral-100 w-full max-w-md p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-poppins font-bold text-neutral-800 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-[#EC6BA5]" /> Pembayaran Kasir
              </h2>
              <button onClick={() => setCheckoutModal(false)} className="text-neutral-400 hover:text-neutral-700 bg-neutral-50 hover:bg-neutral-100 p-2 rounded-full transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="mb-6 bg-[#FFF3F7] border border-[#F8B3CF]/50 rounded-2xl p-6 text-center">
              <p className="text-neutral-600 text-sm mb-1 font-medium font-poppins">Total Tagihan Pasien</p>
              <p className="text-4xl font-poppins font-bold text-[#D63384] tracking-tight mt-2">Rp {total.toLocaleString('id-ID')}</p>
            </div>

            <form onSubmit={handleCheckout}>
              <div className="mb-5">
                <label className="block text-sm font-semibold text-neutral-600 mb-2.5 font-poppins">Metode Pembayaran</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3.5 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 focus:ring-[#D63384]/20 font-medium cursor-pointer appearance-none transition-all">
                  <option value="tunai">Uang Tunai (Cash)</option>
                  <option value="qris" disabled={isOffline}>Scan QRIS {isOffline ? '(Tidak bisa offline)' : ''}</option>
                  <option value="transfer" disabled={isOffline}>Transfer Bank {isOffline ? '(Tidak bisa offline)' : ''}</option>
                  <option value="debit" disabled={isOffline}>Kartu Debit/Kredit {isOffline ? '(Tidak bisa offline)' : ''}</option>
                  <option value="piutang">Piutang (Bayar Nanti)</option>
                </select>
              </div>

              {paymentMethod === 'tunai' && (
                <div className="mb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className="block text-sm font-semibold text-neutral-600 mb-2.5 font-poppins flex justify-between">
                      <span>Uang Tunai Diterima (Rp)</span>
                      <span className="text-xs font-normal text-neutral-400">Kosongkan jika uang pas</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-neutral-400 font-bold">Rp</span>
                      <input 
                        ref={paidAmountRef}
                        type="number" 
                        value={paidAmount} 
                        onChange={(e) => setPaidAmount(e.target.value)} 
                        className="w-full bg-[#F8F9FA] border border-neutral-200 pl-12 pr-4 py-3.5 rounded-xl text-neutral-900 text-xl font-bold focus:outline-none focus:border-[#D63384] focus:ring-2 focus:ring-[#D63384]/20 transition-all font-mono placeholder:text-neutral-300" 
                        placeholder={total.toString()} 
                      />
                    </div>
                  </div>
                  {paidAmount !== '' && Number(paidAmount) >= total && (
                    <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                      <span className="text-emerald-700 font-medium">Uang Kembalian:</span>
                      <span className={`text-lg font-poppins font-bold ${kembalian < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>Rp {kembalian.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>
              )}

              <button type="submit" disabled={checkoutLoading || (paymentMethod === 'tunai' && paidAmount !== '' && Number(paidAmount) < total)} className="w-full bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white py-4 rounded-xl font-poppins font-bold text-base shadow-[0_4px_15px_rgba(214,51,132,0.25)] hover:shadow-[0_6px_20px_rgba(214,51,132,0.4)] disabled:opacity-50 disabled:shadow-none transition-all flex justify-center items-center gap-2 cursor-pointer mt-4">
                {checkoutLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><CheckCircle className="w-5 h-5" /> Selesaikan Transaksi</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog Cetak Struk (Hanya di layar) */}
      {receiptModal && receiptData && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-4 print:hidden">
          <div className="bg-white border border-neutral-100 p-8 rounded-3xl max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner"><CheckCircle className="w-10 h-10" /></div>
            <h3 className="text-neutral-800 font-poppins font-bold text-2xl mb-2 tracking-tight">Pembayaran Sukses!</h3>
            <p className="text-neutral-500 text-sm mb-8 leading-relaxed font-medium">Transaksi telah tercatat. Siapkan kertas di printer kasir.</p>
            <div className="flex flex-col gap-3">
              <button ref={printBtnRef} onClick={executePrint} className="w-full bg-[#D63384] hover:bg-[#8A1E4D] text-white py-4 rounded-xl font-poppins font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-[0_4px_15px_rgba(214,51,132,0.3)] hover:shadow-[0_6px_20px_rgba(214,51,132,0.4)] focus:ring-4 focus:ring-[#D63384]/40">
                <Printer className="w-5 h-5" /> Cetak Struk Pasien
              </button>
              <button onClick={closeReceiptModal} className="w-full bg-white hover:bg-neutral-50 text-neutral-600 py-4 rounded-xl font-poppins font-semibold border border-neutral-200 transition-colors cursor-pointer">
                Tutup & Layani Antrian (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STRUK FISIK (Disembunyikan di layar, khusus untuk mesin printer) */}
      {receiptData && (
        <div id="print-area" className="hidden print:block" style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: '10px',
          fontWeight: 'normal',
          lineHeight: '1.3',
          width: '100%',
          maxWidth: '54mm',
          margin: '0 auto',
          padding: '0 1mm',
          color: 'black',
          boxSizing: 'border-box'
        }}>
          <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 'bold' }}>SESA DERMATOLOGY</div>
          <div style={{ textAlign: 'center' }}>Klinik & Apotek Internal</div>
          <div style={{ borderBottom: '1px dashed black', margin: '4px 0' }}></div>

          <div>No : {receiptData.tx_code}</div>
          <div>Tgl: {receiptData.date}</div>
          <div>Ksr: {receiptData.cashier}</div>
          <div>Psn: {receiptData.patient}</div>

          <div style={{ borderBottom: '1px dashed black', margin: '4px 0' }}></div>

          {receiptData.items.map((item, idx) => (
            <div key={idx} style={{ marginBottom: '3px' }}>
              <div>{item.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{item.qty}x Rp {Number(item.sell_price).toLocaleString('id-ID')}</span>
                <span>Rp {(item.qty * Number(item.sell_price)).toLocaleString('id-ID')}</span>
              </div>
            </div>
          ))}

          <div style={{ borderBottom: '1px dashed black', margin: '4px 0' }}></div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span><span>Rp {receiptData.subtotal.toLocaleString('id-ID')}</span>
          </div>
          {receiptData.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Diskon:</span><span>-Rp {receiptData.discount.toLocaleString('id-ID')}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid black', marginTop: '2px', paddingTop: '2px', fontSize: '12px', fontWeight: 'bold' }}>
            <span>TOTAL:</span><span>Rp {receiptData.total.toLocaleString('id-ID')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span>Metode:</span><span style={{ textTransform: 'capitalize' }}>{receiptData.paymentMethod}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Bayar:</span><span>Rp {receiptData.paidAmount.toLocaleString('id-ID')}</span>
          </div>
          {receiptData.kembalian > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Kembali:</span><span>Rp {receiptData.kembalian.toLocaleString('id-ID')}</span>
            </div>
          )}

          <div style={{ borderBottom: '1px dashed black', margin: '4px 0' }}></div>
          <div style={{ textAlign: 'center', marginTop: '6px' }}>Terima Kasih Atas Kunjungan Anda</div>
        </div>
      )}

    </div>
  );
}