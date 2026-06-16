const db = require('../config/db');

// 1. Mengambil riwayat mutasi kas arus keuangan
const getCashflow = async (req, res) => {
  try {
    // Urutkan dari transaksi yang paling baru terjadi
    const result = await db.query('SELECT * FROM cashflow ORDER BY created_at DESC');
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 2. Mencatat transaksi kas baru secara manual (Pemasukan / Pengeluaran)
const addCashflowTransaction = async (req, res) => {
  try {
    const { type, amount, category, notes } = req.body;
    
    if (!type || !amount || !category) {
      return res.status(400).json({ status: 'error', message: 'Tipe, nominal, dan kategori wajib diisi' });
    }

    const result = await db.query(
      `INSERT INTO cashflow (type, amount, category, notes) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [type, amount, category, notes || null]
    );

    res.status(201).json({ 
      status: 'success', 
      message: 'Transaksi kas berhasil dicatat', 
      data: result.rows[0] 
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = { getCashflow, addCashflowTransaction };