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
    // Tangkap data spesifik secara ketat termasuk kolom baru
    const { 
      name, category, barcode, buy_price, sell_price, stock, is_service, 
      unit, batch_number, expired_date 
    } = req.body;

    const product = await productService.createProduct({
      name, category, barcode, buy_price, sell_price, stock, is_service, 
      unit, batch_number, expired_date
    });

    res.status(201).json({ status: 'success', message: 'Produk berhasil ditambahkan', data: product });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Tangkap data spesifik secara ketat termasuk kolom baru
    const { 
      name, category, barcode, buy_price, sell_price, stock, is_service, 
      unit, batch_number, expired_date 
    } = req.body;

    const product = await productService.updateProduct(id, {
      name, category, barcode, buy_price, sell_price, stock, is_service, 
      unit, batch_number, expired_date
    });
    
    if (!product) {
      return res.status(404).json({ status: 'error', message: 'Produk tidak ditemukan' });
    }
    
    res.status(200).json({ status: 'success', message: 'Data produk berhasil diperbarui', data: product });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

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