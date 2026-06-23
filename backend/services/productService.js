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
  const { 
    sku, barcode, name, category, source, supplier, 
    buy_price, sell_price, stock, min_stock, is_service,
    unit, batch_number, expired_date // <-- 3 Kolom Baru
  } = data;
  
  // 1. Buat SKU otomatis jika tidak dikirim dari Frontend
  const generatedSku = sku || `PRD-${Date.now().toString().slice(-6)}`;
  
  // 2. Cegah error tanggal dari PostgreSQL jika kosong
  const finalExpiredDate = (expired_date === '' || expired_date === undefined) ? null : expired_date;
  const finalBatchNumber = (batch_number === '' || batch_number === undefined) ? null : batch_number;

  const query = `
    INSERT INTO products (
      sku, barcode, name, category, source, supplier, 
      buy_price, sell_price, stock, min_stock, is_service,
      unit, batch_number, expired_date
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *;
  `;
  
  const values = [
    generatedSku, 
    barcode || null, 
    name, 
    category, 
    source || null, 
    supplier || null, 
    Number(buy_price) || 0, 
    Number(sell_price) || 0, 
    Number(stock) || 0, 
    Number(min_stock) || 0, 
    is_service || false,
    unit || 'pcs',
    finalBatchNumber,
    finalExpiredDate
  ];

  const result = await db.query(query, values);
  return result.rows[0];
};

const updateProduct = async (id, data) => {
  const { 
    sku, barcode, name, category, 
    buy_price, sell_price, stock, is_service,
    unit, batch_number, expired_date // <-- 3 Kolom Baru
  } = data;
  
  // 1. Cegah bentrok Unique Constraint untuk barcode
  const finalBarcode = (barcode === '' || barcode === undefined) ? null : barcode;

  // 2. Konversi tanggal kosong menjadi NULL
  const finalExpiredDate = (expired_date === '' || expired_date === undefined) ? null : expired_date;
  const finalBatchNumber = (batch_number === '' || batch_number === undefined) ? null : batch_number;

  // 3. Pastikan tipe data dikonversi ke angka yang valid
  const finalBuyPrice = Number(buy_price) || 0;
  const finalSellPrice = Number(sell_price) || 0;
  const finalStock = Number(stock) || 0;
  
  // Menggunakan COALESCE untuk SKU agar tidak tertimpa NULL jika tidak dikirim frontend
  const result = await db.query(
    `UPDATE products 
     SET 
        sku = COALESCE($1, sku), 
        barcode = $2, 
        name = $3, 
        category = $4, 
        buy_price = $5, 
        sell_price = $6, 
        stock = $7, 
        is_service = $8, 
        unit = $9, 
        batch_number = $10, 
        expired_date = $11, 
        updated_at = CURRENT_TIMESTAMP 
     WHERE id = $12 RETURNING *`,
    [
      sku, finalBarcode, name, category, finalBuyPrice, finalSellPrice, 
      finalStock, is_service || false, unit || 'pcs', finalBatchNumber, 
      finalExpiredDate, id
    ]
  );

  if (result.rows.length === 0) {
    throw new Error('Produk tidak ditemukan saat proses update');
  }

  return result.rows[0];
};

const deleteProduct = async (id) => {
  const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
  if (result.rows.length === 0) {
    throw new Error('Produk tidak ditemukan');
  }
  return result.rows[0];
};

module.exports = { getAllProducts, createProduct, updateProduct, deleteProduct };