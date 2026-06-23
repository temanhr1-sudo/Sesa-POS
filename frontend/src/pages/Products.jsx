import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import * as XLSX from 'xlsx'; // IMPORT LIBRARY EXCEL
import { 
  Package, Plus, Search, Edit, Trash2, X, AlertTriangle, 
  ScanLine, ArrowDownToLine, CheckCircle, TrendingUp, Percent, CalendarDays,
  Download, Upload // ICON BARU UNTUK EXPORT & IMPORT
} from 'lucide-react';

export default function Products() {
  const { token, user } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // === STATE UNTUK MODAL TAMBAH/EDIT PRODUK ===
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [margin, setMargin] = useState(''); 
  const [processLoading, setProcessLoading] = useState(false);

  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    category: 'obat',
    buy_price: '',
    sell_price: '',
    stock: '',
    is_service: false,
    unit: 'pcs',
    batch_number: '',
    expired_date: ''
  });

  // === STATE UNTUK MODAL SCAN BARANG MASUK ===
  const [stockInModal, setStockInModal] = useState(false);
  const [stockInStep, setStockInStep] = useState(1);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [foundProduct, setFoundProduct] = useState(null);
  const [addedQty, setAddedQty] = useState('');

  const barcodeInputRef = useRef(null);
  const fileInputRef = useRef(null); // Ref untuk input file Excel tersembunyi

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(res.data.data);
    } catch (error) {
      console.error('Gagal memuat produk:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [token]);

  useEffect(() => {
    if (stockInModal && stockInStep === 1 && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [stockInModal, stockInStep]);

  // === LOGIKA KALKULATOR MARGIN OTOMATIS ===
  const handleBuyPriceChange = (e) => {
    const buyPrice = e.target.value;
    setFormData(prev => {
      const newData = { ...prev, buy_price: buyPrice };
      if (margin && Number(margin) > 0 && buyPrice) {
        newData.sell_price = Math.round(Number(buyPrice) + (Number(buyPrice) * Number(margin) / 100));
      }
      return newData;
    });
  };

  const handleMarginChange = (e) => {
    const marginValue = e.target.value;
    setMargin(marginValue);
    if (marginValue && Number(marginValue) > 0 && formData.buy_price) {
      setFormData(prev => ({
        ...prev,
        sell_price: Math.round(Number(prev.buy_price) + (Number(prev.buy_price) * Number(marginValue) / 100))
      }));
    }
  };

  // === FUNGSI TAMBAH / EDIT PRODUK (MASTER) ===
  const handleOpenModal = (product = null) => {
    if (product) {
      setEditId(product.id);
      setFormData({
        sku: product.sku,
        barcode: product.barcode || '',
        name: product.name,
        category: product.category,
        buy_price: product.buy_price || '',
        sell_price: product.sell_price,
        stock: product.stock,
        is_service: product.is_service,
        unit: product.unit || 'pcs',
        batch_number: product.batch_number || '',
        // Format YYYY-MM-DD agar pas di input type="date"
        expired_date: product.expired_date ? product.expired_date.split('T')[0] : '' 
      });
      setMargin(''); 
    } else {
      setEditId(null);
      setMargin('');
      setFormData({ sku: '', barcode: '', name: '', category: 'obat', buy_price: '', sell_price: '', stock: '', is_service: false, unit: 'pcs', batch_number: '', expired_date: '' });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessLoading(true);

    const payload = {
      ...formData,
      buy_price: Number(formData.buy_price) || 0,
      sell_price: Number(formData.sell_price) || 0,
      stock: formData.is_service ? 0 : (Number(formData.stock) || 0),
      expired_date: formData.expired_date || null 
    };

    try {
      if (editId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/products/${editId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/products`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setModalOpen(false);
      fetchProducts();
    } catch (error) {
      alert(error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setProcessLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus produk ini secara permanen?')) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL}/products/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchProducts();
      } catch (error) {
        alert('Gagal menghapus produk. Mungkin produk ini sudah terikat dengan transaksi kasir.');
      }
    }
  };

  // === FUNGSI BARANG MASUK (SCAN & TAMBAH STOK) ===
  const handleScanSubmit = (e) => {
    e.preventDefault();
    if (!scannedBarcode) return;

    const product = products.find(p => p.barcode === scannedBarcode || p.sku === scannedBarcode);
    
    if (product) {
      if (product.is_service) {
        alert('Jasa/Layanan tidak memiliki stok fisik!');
        setScannedBarcode('');
        return;
      }
      setFoundProduct(product);
      setStockInStep(2);
    } else {
      alert(`Produk dengan Barcode/SKU "${scannedBarcode}" belum terdaftar di Master Produk.`);
      setScannedBarcode('');
    }
  };

  const handleStockInSubmit = async (e) => {
    e.preventDefault();
    if (!addedQty || Number(addedQty) <= 0) return alert('Jumlah barang masuk tidak valid!');

    setProcessLoading(true);
    try {
      const updatedStock = Number(foundProduct.stock) + Number(addedQty);
      
      await axios.put(`${import.meta.env.VITE_API_URL}/products/${foundProduct.id}`, {
        ...foundProduct,
        stock: updatedStock
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(`Sukses! Stok ${foundProduct.name} bertambah ${addedQty}. (Total Stok Baru: ${updatedStock})`);
      
      setStockInModal(false);
      setStockInStep(1);
      setScannedBarcode('');
      setFoundProduct(null);
      setAddedQty('');
      fetchProducts();

    } catch (error) {
      alert(error.response?.data?.message || 'Gagal menambahkan stok');
    } finally {
      setProcessLoading(false);
    }
  };

  const closeStockInModal = () => {
    setStockInModal(false);
    setStockInStep(1);
    setScannedBarcode('');
    setFoundProduct(null);
    setAddedQty('');
  };

  // === FUNGSI EXPORT EXCEL ===
  const handleExportExcel = () => {
    const exportData = products.map((p, index) => ({
      'No': index + 1,
      'SKU': p.sku,
      'Barcode': p.barcode || '',
      'Nama Item': p.name,
      'Kategori': p.category,
      'Harga Beli (HPP)': p.buy_price,
      'Harga Jual': p.sell_price,
      'Sisa Stok': p.is_service ? '-' : p.stock,
      'Satuan': p.unit || 'pcs',
      'Nomor Batch': p.batch_number || '',
      // Format YYYY-MM-DD agar Excel gampang baca
      'Tanggal Expired': p.expired_date ? p.expired_date.split('T')[0] : '', 
      'Tipe Jasa': p.is_service ? 'YA' : 'TIDAK'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Master Produk");
    
    // Auto-width columns (Sederhana)
    const colWidths = [
      { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, 
      { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 10 }
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `Data_Produk_Sesa_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // === FUNGSI IMPORT EXCEL ===
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm(`Yakin ingin meng-import data dari file ${file.name}? Pastikan format kolom sama persis dengan format Export.`)) {
      e.target.value = null;
      return;
    }

    setProcessLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let successCount = 0;
        let failCount = 0;

        // Kita gunakan perulangan For agar berurutan (Mencegah Vercel Serverless Timeout/Rate Limit)
        for (const row of data) {
          try {
            // Pemetaan format Excel kembali ke payload JSON
            const payload = {
              sku: String(row['SKU'] || ''),
              barcode: row['Barcode'] ? String(row['Barcode']) : '',
              name: String(row['Nama Item'] || ''),
              category: String(row['Kategori'] || 'lainnya').toLowerCase(),
              buy_price: Number(row['Harga Beli (HPP)']) || 0,
              sell_price: Number(row['Harga Jual']) || 0,
              stock: row['Tipe Jasa'] === 'YA' ? 0 : (Number(row['Sisa Stok']) || 0),
              is_service: row['Tipe Jasa'] === 'YA',
              unit: String(row['Satuan'] || 'pcs').toLowerCase(),
              batch_number: row['Nomor Batch'] ? String(row['Nomor Batch']) : '',
              expired_date: row['Tanggal Expired'] ? String(row['Tanggal Expired']) : null
            };

            // Abaikan baris kosong
            if (!payload.name) {
              continue; 
            }

            await axios.post(`${import.meta.env.VITE_API_URL}/products`, payload, {
              headers: { Authorization: `Bearer ${token}` }
            });
            successCount++;

          } catch (err) {
            console.error('Error import baris:', row['Nama Item'], err.response?.data?.message);
            failCount++;
          }
        }

        alert(`PROSES IMPORT SELESAI!\n\n✅ Berhasil masuk: ${successCount} produk\n❌ Gagal / Dilewati: ${failCount} baris`);
        fetchProducts();

      } catch (error) {
        console.error(error);
        alert('Gagal membaca file Excel. Pastikan file tidak rusak/dikunci.');
      } finally {
        setProcessLoading(false);
        e.target.value = null; // Reset input file agar bisa pilih file yang sama lagi
      }
    };
    
    reader.readAsBinaryString(file);
  };

  // Peringatan Expired Date (<= 30 hari)
  const isExpiringSoon = (dateString) => {
    if (!dateString) return false;
    const expDate = new Date(dateString);
    const today = new Date();
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30; 
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 md:p-10 font-inter bg-[#F8F9FA] min-h-full relative">
      
      {/* OVERLAY LOADING SAAT IMPORT BANYAK DATA */}
      {processLoading && !modalOpen && !stockInModal && (
        <div className="fixed inset-0 z-[500] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-neutral-200 border-t-[#D63384] rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-poppins font-bold text-neutral-800">Sistem Sedang Bekerja...</h2>
          <p className="text-neutral-500 font-medium">Mohon tunggu dan jangan tutup halaman ini.</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-poppins font-bold text-neutral-800 flex items-center gap-3 tracking-tight">
              <div className="p-2.5 bg-[#FFF3F7] rounded-xl shadow-sm">
                <Package className="w-7 h-7 text-[#D63384]" />
              </div>
              Master Produk & Logistik
            </h1>
            <p className="text-neutral-500 mt-2 text-sm font-medium ml-14">Kelola katalog barang, harga, dan ketersediaan stok fisik klinik.</p>
          </div>
          
          {(user?.role === 'superadmin' || user?.role === 'logistik' || user?.role === 'owner') && (
            <div className="flex flex-wrap items-center gap-3">
              
              {/* TOMBOL EXPORT & IMPORT EXCEL */}
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-neutral-200 shadow-sm mr-2">
                <button 
                  onClick={handleExportExcel}
                  className="px-4 py-2.5 rounded-lg text-emerald-600 hover:bg-emerald-50 font-semibold font-poppins text-sm flex items-center gap-2 transition-colors"
                  title="Unduh format Excel"
                >
                  <Download className="w-4 h-4" /> Export
                </button>
                <div className="w-px h-6 bg-neutral-200"></div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-lg text-blue-600 hover:bg-blue-50 font-semibold font-poppins text-sm flex items-center gap-2 transition-colors"
                  title="Upload format Excel"
                >
                  <Upload className="w-4 h-4" /> Import
                </button>
                {/* Input file tersembunyi */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImportExcel} 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                />
              </div>

              <button 
                onClick={() => setStockInModal(true)}
                className="bg-neutral-800 hover:bg-black text-white px-5 py-3.5 rounded-xl font-poppins font-semibold flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <ArrowDownToLine className="w-5 h-5 text-emerald-400" /> Barang Masuk (Scan)
              </button>
              
              <button 
                onClick={() => handleOpenModal()}
                className="bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white px-5 py-3.5 rounded-xl font-poppins font-semibold flex items-center gap-2 transition-all shadow-[0_4px_12px_rgba(214,51,132,0.25)] hover:shadow-[0_6px_15px_rgba(214,51,132,0.4)] cursor-pointer"
              >
                <Plus className="w-5 h-5" /> Tambah Produk
              </button>
            </div>
          )}
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 mb-6 flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-3.5 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Cari berdasarkan Nama, SKU, atau Barcode..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-neutral-200 pl-12 pr-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 focus:ring-[#D63384]/20 transition-all font-medium"
            />
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-neutral-200 text-neutral-600 font-poppins text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold">SKU / Barcode</th>
                  <th className="p-4 font-semibold">Nama Item & Kategori</th>
                  <th className="p-4 font-semibold">Batch & Exp Date</th>
                  <th className="p-4 font-semibold text-right">Harga Beli</th>
                  <th className="p-4 font-semibold text-right">Harga Jual</th>
                  <th className="p-4 font-semibold text-center">Stok</th>
                  {(user?.role === 'superadmin' || user?.role === 'logistik' || user?.role === 'owner') && (
                    <th className="p-4 font-semibold text-center">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr><td colSpan="7" className="p-10 text-center text-neutral-500 font-medium">Memuat data produk...</td></tr>
                ) : filteredProducts.length === 0 ? (
                  <tr><td colSpan="7" className="p-10 text-center text-neutral-400 font-medium">Tidak ada produk ditemukan.</td></tr>
                ) : (
                  filteredProducts.map((item) => {
                    const isCritical = !item.is_service && item.stock <= 5;
                    const isExpWarning = isExpiringSoon(item.expired_date);

                    return (
                      <tr key={item.id} className={`hover:bg-[#FFF3F7]/30 transition-colors ${isCritical ? 'bg-rose-50/40' : ''}`}>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-neutral-700 text-xs">{item.sku}</span>
                            <span className="text-[10px] text-neutral-400 mt-0.5 flex items-center gap-1">
                              <ScanLine className="w-3 h-3"/> {item.barcode || 'Tanpa Barcode'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col items-start">
                            <span className="font-poppins font-bold text-neutral-800 text-sm leading-snug">{item.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 mt-1.5 rounded max-w-max uppercase tracking-wider ${
                              item.is_service ? 'bg-[#FFF3F7] text-[#D63384]' : 'bg-neutral-100 text-neutral-600'
                            }`}>
                              {item.is_service ? 'Layanan Jasa' : item.category}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          {!item.is_service ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-neutral-600 font-mono font-medium">
                                Lot: {item.batch_number || '-'}
                              </span>
                              <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${isExpWarning ? 'text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100 w-max' : 'text-neutral-500'}`}>
                                <CalendarDays className="w-3.5 h-3.5" />
                                {item.expired_date ? new Date(item.expired_date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'}) : 'Tidak ada Exp'}
                              </span>
                            </div>
                          ) : <span className="text-neutral-400 text-xs">-</span>}
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-neutral-500 font-medium text-sm">Rp {Number(item.buy_price).toLocaleString('id-ID')}</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-[#D63384] font-poppins font-bold text-sm tracking-tight">Rp {Number(item.sell_price).toLocaleString('id-ID')}</span>
                        </td>
                        <td className="p-4 text-center">
                          {item.is_service ? (
                            <span className="text-neutral-400 text-xs font-medium italic">- Jasa -</span>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span className={`font-mono font-bold text-lg leading-none ${isCritical ? 'text-rose-600' : 'text-neutral-800'}`}>
                                {item.stock}
                              </span>
                              <span className="text-[10px] text-neutral-500 uppercase">{item.unit}</span>
                              {isCritical && (
                                <span className="flex items-center gap-1 text-[9px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-bold uppercase mt-1">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Kritis
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        {(user?.role === 'superadmin' || user?.role === 'logistik' || user?.role === 'owner') && (
                          <td className="p-4">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => handleOpenModal(item)} className="p-2 bg-neutral-50 border border-neutral-200 hover:border-[#F8B3CF] hover:bg-[#FFF3F7] text-neutral-500 hover:text-[#D63384] rounded-lg transition-all cursor-pointer shadow-sm"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete(item.id)} className="p-2 bg-neutral-50 border border-neutral-200 hover:border-red-200 hover:bg-red-50 text-neutral-500 hover:text-red-500 rounded-lg transition-all cursor-pointer shadow-sm"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        )}
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
          MODAL: TAMBAH STOK BARANG MASUK (SCAN BARCODE)
          ========================================================= */}
      {stockInModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-100 w-full max-w-md p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-neutral-100 pb-4">
              <h2 className="text-xl font-poppins font-bold text-neutral-800 flex items-center gap-2">
                <ArrowDownToLine className="w-6 h-6 text-emerald-500" /> Barang Masuk
              </h2>
              <button onClick={closeStockInModal} className="text-neutral-400 hover:text-neutral-700 bg-neutral-50 hover:bg-neutral-100 p-2 rounded-full transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            {stockInStep === 1 ? (
              <form onSubmit={handleScanSubmit} className="space-y-6 text-center">
                <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-2 border border-neutral-200">
                  <ScanLine className="w-10 h-10 text-neutral-400" />
                </div>
                <p className="text-neutral-500 text-sm font-medium">Arahkan scanner ke barcode kardus/botol, atau ketik manual SKU/Barcode di bawah ini.</p>
                
                <div className="relative group">
                  <ScanLine className="w-5 h-5 absolute left-4 top-3.5 text-[#D63384] group-focus-within:animate-pulse" />
                  <input 
                    ref={barcodeInputRef}
                    type="text" 
                    value={scannedBarcode}
                    onChange={(e) => setScannedBarcode(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-neutral-200 pl-12 pr-4 py-3 rounded-xl text-neutral-900 font-bold font-mono focus:outline-none focus:border-[#D63384] focus:ring-2 focus:ring-[#D63384]/20 transition-all text-center placeholder:font-normal placeholder:text-neutral-400"
                    placeholder="[ TEMBAK BARCODE ]"
                  />
                </div>
                <button type="submit" className="w-full bg-neutral-800 hover:bg-black text-white py-3.5 rounded-xl font-poppins font-bold shadow-md transition-all cursor-pointer">
                  Cari Produk
                </button>
              </form>
            ) : (
              <form onSubmit={handleStockInSubmit} className="space-y-5 animate-in fade-in duration-300">
                <div className="bg-[#FFF3F7] border border-[#F8B3CF]/50 p-4 rounded-2xl flex items-start gap-4 mb-2">
                  <div className="p-2 bg-white rounded-lg shadow-sm"><Package className="w-6 h-6 text-[#D63384]" /></div>
                  <div>
                    <span className="text-[10px] bg-white text-[#D63384] px-2 py-0.5 rounded font-mono font-bold border border-[#F8B3CF]">{foundProduct?.sku}</span>
                    <h3 className="font-poppins font-bold text-neutral-800 text-sm mt-1 leading-snug">{foundProduct?.name}</h3>
                    <p className="text-neutral-500 text-xs mt-1 font-medium">Stok Saat Ini: <span className="font-bold text-neutral-800">{foundProduct?.stock} {foundProduct?.unit}</span></p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-600 mb-2 font-poppins">Jumlah Masuk ({foundProduct?.unit})</label>
                  <div className="relative">
                    <Plus className="w-5 h-5 absolute left-4 top-3.5 text-emerald-500" />
                    <input 
                      type="number" 
                      required
                      min="1"
                      value={addedQty}
                      onChange={(e) => setAddedQty(e.target.value)}
                      className="w-full bg-emerald-50 border border-emerald-200 pl-12 pr-4 py-3.5 rounded-xl text-emerald-800 text-xl font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setStockInStep(1)} className="w-1/3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 py-3.5 rounded-xl font-poppins font-semibold transition-all cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" disabled={processLoading} className="w-2/3 bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-poppins font-bold shadow-[0_4px_15px_rgba(16,185,129,0.3)] transition-all flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50">
                    {processLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><CheckCircle className="w-5 h-5" /> Simpan Stok</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: TAMBAH / EDIT DATA PRODUK MASTER
          ========================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
            
            <div className="sticky top-0 bg-white z-10 px-8 py-6 border-b border-neutral-100 flex justify-between items-center shadow-sm">
              <h2 className="text-xl font-poppins font-bold text-neutral-800 flex items-center gap-2">
                <Edit className="w-6 h-6 text-[#EC6BA5]" /> {editId ? 'Edit Data Produk' : 'Tambah Produk Baru'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-neutral-400 hover:text-neutral-700 bg-neutral-50 hover:bg-neutral-100 p-2 rounded-full transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              
              <div className="bg-[#F8F9FA] p-5 rounded-2xl border border-neutral-200 space-y-4">
                <div className="flex items-center gap-4 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={!formData.is_service} onChange={() => setFormData({...formData, is_service: false, unit: 'pcs'})} className="accent-[#D63384] w-4 h-4 cursor-pointer" />
                    <span className="text-sm font-semibold font-poppins text-neutral-700">Barang Fisik (Obat/Skincare)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={formData.is_service} onChange={() => setFormData({...formData, is_service: true, stock: '', unit: 'jasa'})} className="accent-[#D63384] w-4 h-4 cursor-pointer" />
                    <span className="text-sm font-semibold font-poppins text-neutral-700">Layanan Jasa (Treatment)</span>
                  </label>
                </div>
              </div>

              {/* IDENTITAS PRODUK */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Kode SKU Internal</label>
                  <input type="text" required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-mono placeholder:text-neutral-400" placeholder="SKU-001" disabled={editId !== null} />
                  {editId && <p className="text-[10px] text-neutral-400 mt-1">*SKU tidak dapat diubah</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Barcode Pabrik (Opsional)</label>
                  <input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-mono placeholder:font-sans placeholder:text-sm placeholder:text-neutral-400" placeholder="Scan barcode kemasan..." />
                </div>
                <div className={formData.is_service ? 'md:col-span-2' : ''}>
                  <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Nama Item / Layanan</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-medium placeholder:text-neutral-400" placeholder="Contoh: Paracetamol 500mg" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Kategori</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-medium cursor-pointer appearance-none">
                    <option value="obat">Obat Medis</option>
                    <option value="skincare">Skincare</option>
                    <option value="alkes">Alat Kesehatan</option>
                    <option value="layanan">Layanan Jasa</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>
                
                {/* PILIHAN SATUAN (Hanya untuk barang fisik) */}
                {!formData.is_service && (
                  <div>
                    <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Satuan Jual</label>
                    <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-medium cursor-pointer appearance-none">
                      <option value="pcs">Pcs</option>
                      <option value="strip">Strip</option>
                      <option value="tablet">Tablet</option>
                      <option value="kapsul">Kapsul</option>
                      <option value="box">Box</option>
                      <option value="botol">Botol</option>
                      <option value="tube">Tube</option>
                      <option value="pot">Pot</option>
                      <option value="ampul">Ampul</option>
                    </select>
                  </div>
                )}
              </div>

              {/* BATCH & EXPIRED DATE (Hanya untuk barang fisik) */}
              {!formData.is_service && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-orange-50 border border-orange-100 rounded-2xl">
                  <div>
                    <label className="block text-sm font-semibold text-orange-800 mb-1.5 font-poppins">Nomor Batch (Lot)</label>
                    <input type="text" value={formData.batch_number} onChange={e => setFormData({...formData, batch_number: e.target.value})} className="w-full bg-white border border-orange-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-orange-400 focus:ring-2 transition-all font-mono text-sm placeholder:font-sans placeholder:text-neutral-400" placeholder="Contoh: BT-2026-X" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-orange-800 mb-1.5 font-poppins">Tanggal Expired</label>
                    <input type="date" value={formData.expired_date} onChange={e => setFormData({...formData, expired_date: e.target.value})} className="w-full bg-white border border-orange-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-orange-400 focus:ring-2 transition-all font-medium cursor-pointer" />
                  </div>
                </div>
              )}

              <hr className="border-neutral-100" />

              {/* HARGA & STOK (DENGAN MARGIN KALKULATOR) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Harga Modal (HPP)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-neutral-400 font-bold text-sm">Rp</span>
                    <input type="number" required value={formData.buy_price} onChange={handleBuyPriceChange} className="w-full bg-[#F8F9FA] border border-neutral-200 pl-9 pr-3 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-mono placeholder:text-neutral-300" placeholder="0" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-emerald-600 mb-1.5 font-poppins">Margin Untung (%)</label>
                  <div className="relative">
                    <input type="number" value={margin} onChange={handleMarginChange} className="w-full bg-emerald-50 border border-emerald-200 pl-4 pr-10 py-3 rounded-xl text-emerald-700 font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 transition-all font-mono placeholder:text-emerald-300 placeholder:font-sans placeholder:font-medium placeholder:text-sm" placeholder="Berapa %?" />
                    <Percent className="w-4 h-4 absolute right-4 top-3.5 text-emerald-500" />
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">*Otomatis hitung harga jual</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#D63384] mb-1.5 font-poppins">Harga Jual Akhir</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-[#D63384] font-bold text-sm">Rp</span>
                    <input type="number" required value={formData.sell_price} onChange={e => setFormData({...formData, sell_price: e.target.value})} className="w-full bg-[#FFF3F7] border border-[#F8B3CF] pl-9 pr-3 py-3 rounded-xl text-[#D63384] font-bold focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-mono placeholder:text-[#F8B3CF]" placeholder="0" />
                  </div>
                </div>
              </div>

              {!formData.is_service && (
                <div className="w-full md:w-1/3">
                  <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Stok Fisik Awal</label>
                  <input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-mono font-bold placeholder:text-neutral-300" placeholder="0" />
                </div>
              )}

              {/* INDIKATOR MARGIN OTOMATIS */}
              {Number(formData.sell_price) > 0 && (
                <div className={`p-4 rounded-xl flex items-center justify-between border ${((Number(formData.sell_price) - Number(formData.buy_price)) / Number(formData.sell_price) * 100) < 20 ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'}`}>
                   <div className="flex items-center gap-2">
                     <TrendingUp className={`w-5 h-5 ${((Number(formData.sell_price) - Number(formData.buy_price)) / Number(formData.sell_price) * 100) < 20 ? 'text-orange-500' : 'text-emerald-500'}`} />
                     <span className={`text-sm font-semibold font-poppins ${((Number(formData.sell_price) - Number(formData.buy_price)) / Number(formData.sell_price) * 100) < 20 ? 'text-orange-700' : 'text-emerald-700'}`}>Estimasi Margin Profit Kotor:</span>
                   </div>
                   <div className="text-right">
                     <span className={`text-lg font-bold font-mono ${((Number(formData.sell_price) - Number(formData.buy_price)) / Number(formData.sell_price) * 100) < 20 ? 'text-orange-600' : 'text-emerald-600'}`}>
                       {Number(formData.sell_price) > 0 ? (((Number(formData.sell_price) - Number(formData.buy_price)) / Number(formData.sell_price)) * 100).toFixed(1) : 0}%
                     </span>
                     <p className={`text-xs font-medium ${((Number(formData.sell_price) - Number(formData.buy_price)) / Number(formData.sell_price) * 100) < 20 ? 'text-orange-500' : 'text-emerald-500'}`}>(+ Rp {(Number(formData.sell_price) - Number(formData.buy_price)).toLocaleString('id-ID')})</p>
                   </div>
                </div>
              )}

              <div className="pt-4 border-t border-neutral-100 flex gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="w-1/3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 py-4 rounded-xl font-poppins font-semibold transition-all cursor-pointer">
                  Batal
                </button>
                <button type="submit" disabled={processLoading} className="w-2/3 bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white py-4 rounded-xl font-poppins font-bold shadow-[0_4px_15px_rgba(214,51,132,0.25)] hover:shadow-[0_6px_20px_rgba(214,51,132,0.4)] transition-all cursor-pointer disabled:opacity-50 flex justify-center items-center gap-2">
                  {processLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><CheckCircle className="w-5 h-5" /> Simpan Data Produk</>}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}