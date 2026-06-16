const db = require('../config/db');

// 1. Mengambil daftar semua piutang (Transaksi yang belum lunas)
const getReceivables = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        t.id, 
        t.tx_code, 
        t.created_at, 
        t.total, 
        t.paid_amount, 
        (t.total - t.paid_amount) AS sisa_piutang, 
        p.name AS patient_name, 
        p.phone AS patient_phone 
      FROM transactions t 
      LEFT JOIN patients p ON t.patient_id = p.id 
      WHERE t.payment_method = 'piutang' AND t.total > t.paid_amount
      ORDER BY t.created_at ASC
    `);
    
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 2. Menerima pembayaran cicilan/pelunasan piutang
const collectReceivable = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount_paid } = req.body; // Nominal uang yang dibayarkan sekarang

    // Cari data transaksi aslinya
    const tx = await db.query('SELECT total, paid_amount FROM transactions WHERE id = $1', [id]);
    
    if (tx.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Data piutang tidak ditemukan' });
    }

    const currentPaid = Number(tx.rows[0].paid_amount);
    const total = Number(tx.rows[0].total);
    const newPaid = currentPaid + Number(amount_paid);

    // Validasi agar tidak kelebihan bayar
    if (newPaid > total) {
      return res.status(400).json({ status: 'error', message: 'Nominal bayar melebihi sisa piutang pasien!' });
    }

    // Update jumlah yang sudah dibayar ke database
    const result = await db.query(
      'UPDATE transactions SET paid_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newPaid, id]
    );

    res.status(200).json({ 
      status: 'success', 
      message: newPaid === total ? 'Piutang berhasil DILUNASI!' : 'Pembayaran cicilan piutang berhasil dicatat!', 
      data: result.rows[0] 
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = { getReceivables, collectReceivable };