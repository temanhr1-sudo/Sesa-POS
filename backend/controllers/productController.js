const productService = require('../services/productService');

const getProducts = async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      search: req.query.search
    };
    const products = await productService.getAllProducts(filters);
    res.status(200).json({ status: 'success', data: products });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const addProduct = async (req, res) => {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json({ status: 'success', message: 'Produk berhasil ditambahkan', data: product });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Fungsi Baru: Update Produk (Termasuk untuk tambah stok dari Scanner)
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productService.updateProduct(id, req.body);
    
    if (!product) {
      return res.status(404).json({ status: 'error', message: 'Produk tidak ditemukan' });
    }
    
    res.status(200).json({ status: 'success', message: 'Data produk berhasil diperbarui', data: product });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Fungsi Baru: Hapus Produk
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await productService.deleteProduct(id);
    res.status(200).json({ status: 'success', message: 'Produk berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = { getProducts, addProduct, updateProduct, deleteProduct };