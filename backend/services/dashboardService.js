const db = require('../config/db');

const getDashboardStats = async () => {
  // 1. Total Transaksi Hari Ini (WIB)
  const todayTx = await db.query(`
    SELECT COUNT(*) AS count 
    FROM transactions 
    WHERE (created_at AT TIME ZONE 'Asia/Jakarta')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
  `);

  // 2. Total Pendapatan Hari Ini (WIB)
  const todayRev = await db.query(`
    SELECT COALESCE(SUM(total), 0) AS total 
    FROM transactions 
    WHERE (created_at AT TIME ZONE 'Asia/Jakarta')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
  `);

  // 3. Daftar Produk Stok Menipis
  const lowStock = await db.query(`
    SELECT id, name, sku, stock, min_stock 
    FROM products 
    WHERE stock <= 5 AND is_service = false
    ORDER BY stock ASC
  `);

  // 4. Hutang PBF Berjalan (total_amount - paid_amount)
  // Memakai ::text agar tidak bentrok dengan tipe enum payable_status
  const payables = await db.query(`
    SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0) AS total 
    FROM payables WHERE status::text = 'pending'
  `);
  
  // 5. Piutang Pasien Tertunda
  const receivables = await db.query(`
    SELECT COALESCE(SUM(total - paid_amount), 0) AS total 
    FROM transactions WHERE payment_method::text = 'piutang' AND total > paid_amount
  `);

  return {
    today_transactions: Number(todayTx.rows[0].count),
    today_revenue: Number(todayRev.rows[0].total),
    low_stock_products: lowStock.rows, 
    unpaid_payables: Number(payables.rows[0].total),
    unpaid_receivables: Number(receivables.rows[0].total)
  };
};

module.exports = { getDashboardStats };