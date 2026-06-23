const db = require('../config/db');

const getAllTransactions = async () => {
  // Ambil semua transaksi beserta nama pasien (jika ada)
  const query = `
    SELECT t.*, p.name as patient_name 
    FROM transactions t
    LEFT JOIN patients p ON t.patient_id = p.id
    ORDER BY t.created_at DESC
  `;
  const result = await db.query(query);
  
  // Ambil juga item-itemnya untuk ditampilkan di modal detail
  const txs = result.rows;
  for (let tx of txs) {
    const itemsRes = await db.query(
      'SELECT product_name as name, qty, unit_price as sell_price FROM transaction_items WHERE transaction_id = $1', 
      [tx.id]
    );
    tx.items = itemsRes.rows;
  }
  
  return txs;
};

const createTransaction = async (data, cashier_id) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Generate Kode Transaksi
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countRes = await client.query('SELECT COUNT(*) FROM transactions WHERE DATE(created_at) = CURRENT_DATE');
    const count = parseInt(countRes.rows[0].count) + 1;
    const tx_code = `TRX-${dateStr}-${count.toString().padStart(3, '0')}`;

    const { patient_id, subtotal, discount, total, payment_method, paid_amount, items, notes } = data;
    const status = payment_method === 'piutang' ? 'piutang' : 'paid';

    // 2. Insert Data Utama Transaksi
    const txQuery = `
      INSERT INTO transactions (tx_code, patient_id, cashier_id, subtotal, discount, total, payment_method, paid_amount, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id;
    `;
    const txValues = [tx_code, patient_id || null, cashier_id, subtotal, discount || 0, total, payment_method, paid_amount || null, status, notes || null];
    const txRes = await client.query(txQuery, txValues);
    const tx_id = txRes.rows[0].id;

    // 3. Proses Setiap Item di Keranjang
    for (let item of items) {
      await client.query(`
        INSERT INTO transaction_items (transaction_id, product_id, product_name, qty, unit_price, subtotal)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [tx_id, item.product_id, item.name, item.qty, item.sell_price, item.qty * item.sell_price]);

      if (!item.is_service) {
        const stockRes = await client.query(`
          UPDATE products SET stock = stock - $1 WHERE id = $2 RETURNING stock
        `, [item.qty, item.product_id]);
        
        const newStock = stockRes.rows[0].stock;

        await client.query(`
          INSERT INTO stock_logs (product_id, type, qty_change, qty_before, qty_after, reference_id, notes, created_by)
          VALUES ($1, 'out', $2, $3, $4, $5, 'Penjualan Kasir', $6)
        `, [item.product_id, -Math.abs(item.qty), newStock + item.qty, newStock, tx_id, cashier_id]);
      }
    }

    // 4. Catat Cashflow
    if (payment_method !== 'piutang') {
       await client.query(`
         INSERT INTO cashflow (type, amount, category, description, transaction_id, date, created_by)
         VALUES ('in', $1, 'Penjualan', 'Pendapatan dari transaksi kasir', $2, CURRENT_DATE, $3)
       `, [total, tx_id, cashier_id]);
    }

    // 5. Catat Piutang
    if (payment_method === 'piutang') {
        let entity_name = 'Pasien/Mitra Tidak Diketahui';
        if (patient_id) {
            const pRes = await client.query('SELECT name FROM patients WHERE id = $1', [patient_id]);
            if (pRes.rows.length > 0) entity_name = pRes.rows[0].name;
        }
        await client.query(`
          INSERT INTO receivables (patient_id, entity_name, transaction_id, total_amount, paid_amount, due_date, status, notes)
          VALUES ($1, $2, $3, $4, 0, CURRENT_DATE + INTERVAL '30 days', 'unpaid', 'Piutang Transaksi Kasir')
        `, [patient_id || null, entity_name, tx_id, total]);
    }

    await client.query('COMMIT');
    return { tx_id, tx_code };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const returnTransaction = async (transactionId, cashier_id) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Validasi Transaksi
    const txCheck = await client.query('SELECT * FROM transactions WHERE id = $1', [transactionId]);
    if (txCheck.rows.length === 0) throw new Error('Transaksi tidak ditemukan');
    
    const tx = txCheck.rows[0];
    if (tx.status === 'returned') throw new Error('Transaksi ini sudah diretur sebelumnya');

    // 2. Tarik semua item yang dibeli
    const itemsRes = await client.query('SELECT product_id, qty FROM transaction_items WHERE transaction_id = $1', [transactionId]);
    const items = itemsRes.rows;

    // 3. Kembalikan Stok & Catat Log (Hanya untuk barang fisik)
    for (let item of items) {
      // Cek apakah ini barang fisik (bukan layanan)
      const prodCheck = await client.query('SELECT is_service FROM products WHERE id = $1', [item.product_id]);
      const isService = prodCheck.rows.length > 0 ? prodCheck.rows[0].is_service : false;

      if (!isService) {
        // Balikin stok
        const stockRes = await client.query(`
          UPDATE products SET stock = stock + $1 WHERE id = $2 RETURNING stock
        `, [item.qty, item.product_id]);
        const newStock = stockRes.rows[0].stock;

        // Catat di Stock Logs (masuk kembali)
        await client.query(`
          INSERT INTO stock_logs (product_id, type, qty_change, qty_before, qty_after, reference_id, notes, created_by)
          VALUES ($1, 'in', $2, $3, $4, $5, 'Return Pembatalan Transaksi', $6)
        `, [item.product_id, item.qty, newStock - item.qty, newStock, tx.id, cashier_id]);
      }
    }

    // 4. Balikkan Arus Kas (Bikin catatan pengeluaran / refund agar balance)
    if (tx.payment_method !== 'piutang') {
      await client.query(`
        INSERT INTO cashflow (type, amount, category, description, transaction_id, date, created_by)
        VALUES ('out', $1, 'Pengeluaran', 'Refund Pembatalan Transaksi Kasir', $2, CURRENT_DATE, $3)
      `, [tx.total, tx.id, cashier_id]);
    }

    // 5. Batalkan Piutang jika asalnya piutang
    if (tx.payment_method === 'piutang') {
      await client.query(`
        UPDATE receivables SET status = 'cancelled', notes = 'Piutang Dibatalkan (Return Transaksi)' 
        WHERE transaction_id = $1
      `, [tx.id]);
    }

    // 6. Ubah status transaksi utama jadi 'returned'
    await client.query(`UPDATE transactions SET status = 'returned', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [transactionId]);

    await client.query('COMMIT');
    return { message: 'Transaksi berhasil dibatalkan dan diretur' };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { getAllTransactions, createTransaction, returnTransaction };