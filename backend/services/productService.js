const db = require('../config/db');

const getAllProducts = async (filters) => {
  let query = 'SELECT * FROM products WHERE 1=1';
  const values = [];
  let counter = 1;

  if (filters.category) {
    query += ` AND category = $${counter}`;
    values.push(filters.category);
    counter++;
  }

  if (filters.search) {
    query += ` AND (name ILIKE $${counter} OR sku ILIKE $${counter} OR barcode ILIKE $${counter})`;
    values.push(`%${filters.search}%`);
    counter++;
  }

  query += ' ORDER BY created_at DESC';
  
  const result = await db.query(query, values);
  return result.rows;
};

const createProduct = async (data) => {
  const { sku, barcode, name, category, source, supplier, buy_price, sell_price, stock, min_stock, is_service } = data;
  
  const query = `
    INSERT INTO products (sku, barcode, name, category, source, supplier, buy_price, sell_price, stock, min_stock, is_service)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *;
  `;
  
  const values = [
    sku, 
    barcode || null, 
    name, 
    category, 
    source, 
    supplier || null, 
    buy_price || 0, 
    sell_price, 
    stock || 0, 
    min_stock || 0, 
    is_service || false
  ];

  const result = await db.query(query, values);
  return result.rows[0];
};

// Timpa fungsi updateProduct dengan versi kebal peluru ini
const updateProduct = async (id, data) => {
  const { sku, barcode, name, category, buy_price, sell_price, stock, is_service } = data;
  
  // 1. Ubah barcode string kosong menjadi NULL agar tidak bentrok (Unique Constraint)
  const finalBarcode = (barcode === '' || barcode === undefined) ? null : barcode;

  // 2. Pastikan tipe data dikonversi ke angka yang valid
  const finalBuyPrice = Number(buy_price) || 0;
  const finalSellPrice = Number(sell_price) || 0;
  const finalStock = Number(stock) || 0;
  
  // 3. Kembalikan updated_at karena kolomnya ternyata ADA di tabel kamu
  const result = await db.query(
    `UPDATE products 
     SET sku = $1, barcode = $2, name = $3, category = $4, buy_price = $5, sell_price = $6, stock = $7, is_service = $8, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $9 RETURNING *`,
    [sku, finalBarcode, name, category, finalBuyPrice, finalSellPrice, finalStock, is_service || false, id]
  );

  if (result.rows.length === 0) {
    throw new Error('Produk tidak ditemukan saat proses update');
  }

  return result.rows[0];
};

// Pastikan fungsi delete ini juga ada
const deleteProduct = async (id) => {
  const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
  if (result.rows.length === 0) {
    throw new Error('Produk tidak ditemukan');
  }
  return result.rows[0];
};

module.exports = { getAllProducts, createProduct, updateProduct, deleteProduct };