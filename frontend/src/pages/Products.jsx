import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { 
  Package, Plus, Search, Edit, Trash2, X, AlertTriangle, 
  ScanLine, ArrowDownToLine, CheckCircle, TrendingUp
} from 'lucide-react';

export default function Products() {
  const { token } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // === STATE UNTUK MODAL TAMBAH/EDIT PRODUK ===
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    category: 'obat',
    buy_price: '',
    sell_price: '',
    stock: '',
    is_service: false
  });

  // === STATE UNTUK MODAL SCAN BARANG MASUK ===
  const [stockInModal, setStockInModal] = useState(false);
  const [stockInStep, setStockInStep] = useState(1); // 1: Scan Barcode, 2: Input Qty
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [foundProduct, setFoundProduct] = useState(null);
  const [addedQty, setAddedQty] = useState('');
  const [processLoading, setProcessLoading] = useState(false);

  const barcodeInputRef = useRef(null);

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

  // Autofocus input barcode saat modal barang masuk terbuka
  useEffect(() => {
    if (stockInModal && stockInStep === 1 && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [stockInModal, stockInStep]);

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
        is_service: product.is_service
      });
    } else {
      setEditId(null);
      setFormData({ sku: '', barcode: '', name: '', category: 'obat', buy_price: '', sell_price: '', stock: '', is_service: false });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessLoading(true);
    try {
      if (editId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/products/${editId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/products`, formData, {
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
    if (window.confirm('Yakin ingin menghapus produk ini?')) {
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
      setStockInStep(2); // Pindah ke langkah input jumlah
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
      
      // Update stok produk
      await axios.put(`${import.meta.env.VITE_API_URL}/products/${foundProduct.id}`, {
        ...foundProduct,
        stock: updatedStock
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(`Sukses! Stok ${foundProduct.name} bertambah ${addedQty}. (Total Stok Baru: ${updatedStock})`);
      
      // Reset Modal & Refresh Data
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

  // Kalkulasi Margin untuk UI Modal
  const buyPrice = Number(formData.buy_price) || 0;
  const sellPrice = Number(formData.sell_price) || 0;
  const marginRp = sellPrice - buyPrice;
  const marginPercent = sellPrice > 0 ? ((marginRp / sellPrice) * 100).toFixed(1) : 0;

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 font-inter bg-[#F8F9FA] min-h-full">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-poppins font-bold text-neutral-800 flex items-center gap-3 tracking-tight">
              <div className="p-2.5 bg-[#FFF3F7] rounded-xl shadow-sm">
                <Package className="w-7 h-7 text-[#D63384]" />
              </div>
              Master Produk & Logistik
            </h1>
            <p className="text-neutral-500 mt-2 text-sm font-medium ml-14">Kelola katalog barang, harga, dan ketersediaan stok fisik klinik.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => setStockInModal(true)}
              className="bg-neutral-800 hover:bg-black text-white px-5 py-3 rounded-xl font-poppins font-semibold flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <ArrowDownToLine className="w-5 h-5 text-emerald-400" /> Barang Masuk (Scan)
            </button>
            <button 
              onClick={() => handleOpenModal()}
              className="bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white px-5 py-3 rounded-xl font-poppins font-semibold flex items-center gap-2 transition-all shadow-[0_4px_12px_rgba(214,51,132,0.25)] hover:shadow-[0_6px_15px_rgba(214,51,132,0.4)] cursor-pointer"
            >
              <Plus className="w-5 h-5" /> Tambah Data Produk
            </button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 mb-6 flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-3.5 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Cari berdasarkan Nama atau SKU Produk..." 
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
                <tr className="bg-[#F8F9FA] border-b border-neutral-200 text-neutral-600 font-poppins text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">Info Produk</th>
                  <th className="p-4 font-semibold">Kategori</th>
                  <th className="p-4 font-semibold">Harga Jual</th>
                  <th className="p-4 font-semibold text-center">Stok Sisa</th>
                  <th className="p-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-10 text-center text-neutral-500 font-medium">Memuat data produk...</td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-10 text-center text-neutral-500 font-medium">Tidak ada produk yang ditemukan.</td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const isCritical = !product.is_service && product.stock <= 5;
                    return (
                      <tr key={product.id} className={`hover:bg-neutral-50 transition-colors ${isCritical ? 'bg-rose-50/40' : ''}`}>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-neutral-800 font-bold font-poppins text-sm mb-1">{product.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded font-mono font-semibold border border-neutral-200">{product.sku}</span>
                              {product.barcode && <span className="text-xs text-neutral-400 font-mono flex items-center gap-1"><ScanLine className="w-3 h-3"/> {product.barcode}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                            product.is_service ? 'bg-[#FFF3F7] text-[#D63384]' : 'bg-neutral-100 text-neutral-600'
                          }`}>
                            {product.category}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-[#D63384] font-bold font-poppins">Rp {Number(product.sell_price).toLocaleString('id-ID')}</span>
                        </td>
                        <td className="p-4 text-center">
                          {product.is_service ? (
                            <span className="text-neutral-400 text-sm italic font-medium">- Jasa -</span>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-lg font-bold font-mono ${isCritical ? 'text-rose-600' : 'text-neutral-800'}`}>
                                {product.stock}
                              </span>
                              {isCritical && (
                                <span className="flex items-center gap-1 text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-bold uppercase">
                                  <AlertTriangle className="w-3 h-3" /> Kritis
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleOpenModal(product)} className="p-2 bg-neutral-100 hover:bg-[#FFF3F7] text-neutral-500 hover:text-[#D63384] rounded-lg transition-colors cursor-pointer" title="Edit Data">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(product.id)} className="p-2 bg-neutral-100 hover:bg-red-50 text-neutral-500 hover:text-red-500 rounded-lg transition-colors cursor-pointer" title="Hapus Data">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
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
                    <p className="text-neutral-500 text-xs mt-1 font-medium">Stok Saat Ini: <span className="font-bold text-neutral-800">{foundProduct?.stock}</span></p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-600 mb-2 font-poppins">Jumlah Masuk (Pcs/Box)</label>
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
          <div className="bg-white border border-neutral-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-neutral-100 pb-4">
              <h2 className="text-xl font-poppins font-bold text-neutral-800 flex items-center gap-2">
                <Edit className="w-6 h-6 text-[#EC6BA5]" /> {editId ? 'Edit Data Produk' : 'Tambah Produk Baru'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-neutral-400 hover:text-neutral-700 bg-neutral-50 hover:bg-neutral-100 p-2 rounded-full transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Nama Produk / Layanan</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all placeholder:text-neutral-400 font-medium" placeholder="Contoh: Salep Jerawat Sesa" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Kategori</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all cursor-pointer font-medium appearance-none">
                    <option value="skincare">Skincare</option>
                    <option value="obat">Obat Medis</option>
                    <option value="alkes">Alat Kesehatan</option>
                    <option value="layanan">Layanan / Tindakan Medis</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Kode SKU Internal</label>
                  <input type="text" required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-mono placeholder:text-neutral-400" placeholder="SKU-001" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Barcode Pabrik (Opsional)</label>
                  <input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-mono placeholder:text-neutral-400" placeholder="Scan barcode..." />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-[#FFF3F7] border border-[#F8B3CF]/50 rounded-xl">
                <input type="checkbox" id="is_service" checked={formData.is_service} onChange={e => setFormData({...formData, is_service: e.target.checked, stock: e.target.checked ? 0 : formData.stock})} className="w-5 h-5 text-[#D63384] bg-white border-neutral-300 rounded focus:ring-[#D63384] cursor-pointer" />
                <label htmlFor="is_service" className="text-sm font-semibold text-[#D63384] font-poppins cursor-pointer">Tandai ini sebagai Jasa/Layanan (Tidak pakai sistem Stok)</label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-neutral-100 pt-5 mt-5">
                {!formData.is_service && (
                  <div>
                    <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Stok Awal</label>
                    <input type="number" required={!formData.is_service} value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 px-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-mono font-bold" placeholder="0" />
                  </div>
                )}
                <div className={formData.is_service ? 'col-span-1 md:col-span-1' : ''}>
                  <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Harga Modal (HPP)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-neutral-400 font-bold">Rp</span>
                    <input type="number" value={formData.buy_price} onChange={e => setFormData({...formData, buy_price: e.target.value})} className="w-full bg-[#F8F9FA] border border-neutral-200 pl-10 pr-4 py-3 rounded-xl text-neutral-800 focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-mono" placeholder="0" />
                  </div>
                </div>
                <div className={formData.is_service ? 'col-span-1 md:col-span-2' : ''}>
                  <label className="block text-sm font-semibold text-neutral-600 mb-1.5 font-poppins">Harga Jual Pasien</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-[#D63384] font-bold">Rp</span>
                    <input type="number" required value={formData.sell_price} onChange={e => setFormData({...formData, sell_price: e.target.value})} className="w-full bg-[#FFF3F7] border border-[#F8B3CF] pl-10 pr-4 py-3 rounded-xl text-[#D63384] font-bold focus:outline-none focus:border-[#D63384] focus:ring-2 transition-all font-mono" placeholder="0" />
                  </div>
                </div>
              </div>

              {/* INDIKATOR MARGIN OTOMATIS */}
              {sellPrice > 0 && (
                <div className={`p-4 rounded-xl flex items-center justify-between border ${marginPercent < 20 ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'}`}>
                   <div className="flex items-center gap-2">
                     <TrendingUp className={`w-5 h-5 ${marginPercent < 20 ? 'text-orange-500' : 'text-emerald-500'}`} />
                     <span className={`text-sm font-semibold font-poppins ${marginPercent < 20 ? 'text-orange-700' : 'text-emerald-700'}`}>Estimasi Margin Profit Kotor:</span>
                   </div>
                   <div className="text-right">
                     <span className={`text-lg font-bold font-mono ${marginPercent < 20 ? 'text-orange-600' : 'text-emerald-600'}`}>
                       {marginPercent}%
                     </span>
                     <p className={`text-xs font-medium ${marginPercent < 20 ? 'text-orange-500' : 'text-emerald-500'}`}>(+ Rp {marginRp.toLocaleString('id-ID')})</p>
                   </div>
                </div>
              )}

              <div className="pt-4 border-t border-neutral-100 flex gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="w-1/3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 py-3.5 rounded-xl font-poppins font-semibold transition-all cursor-pointer">
                  Batal
                </button>
                <button type="submit" disabled={processLoading} className="w-2/3 bg-gradient-to-r from-[#EC6BA5] to-[#D63384] hover:from-[#D63384] hover:to-[#8A1E4D] text-white py-3.5 rounded-xl font-poppins font-bold shadow-[0_4px_15px_rgba(214,51,132,0.25)] hover:shadow-[0_6px_20px_rgba(214,51,132,0.4)] transition-all cursor-pointer disabled:opacity-50 flex justify-center items-center gap-2">
                  {processLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Simpan Data Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}