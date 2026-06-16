const db = require('../config/db');

const createTransaction = async (data, cashier_id) => {
  // Buka koneksi khusus untuk transaksi Atomic
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN'); // Mulai mode transaksi

    // 1. Generate Kode Transaksi (Format: TRX-YYYYMMDD-XXX)
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
      // Insert ke transaction_items
      await client.query(`
        INSERT INTO transaction_items (transaction_id, product_id, product_name, qty, unit_price, subtotal)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [tx_id, item.product_id, item.name, item.qty, item.sell_price, item.qty * item.sell_price]);

      // Jika bukan layanan (is_service = false), kurangi stok & catat log [cite: 237]
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

    // 4. Catat Cashflow Otomatis (Sumber Kebenaran Tunggal) [cite: 244, 245]
    if (payment_method !== 'piutang') {
       await client.query(`
         INSERT INTO cashflow (type, amount, category, description, transaction_id, date, created_by)
         VALUES ('in', $1, 'Penjualan', 'Pendapatan dari transaksi kasir', $2, CURRENT_DATE, $3)
       `, [total, tx_id, cashier_id]);
    }

    // 5. Catat Piutang Otomatis (Jika metode bayar = 'piutang') [cite: 253]
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

    await client.query('COMMIT'); // Simpan permanen jika semua sukses
    return { tx_id, tx_code };

  } catch (error) {
    await client.query('ROLLBACK'); // Batalkan semua perubahan jika ada error 
    throw error;
  } finally {
    client.release(); // Kembalikan koneksi ke pool
  }
};

module.exports = { createTransaction };