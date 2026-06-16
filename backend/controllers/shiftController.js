const db = require('../config/db');

// 1. Cek Shift Aktif
const getActiveShift = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      "SELECT * FROM shifts WHERE user_id = $1 AND status = 'open' LIMIT 1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ status: 'success', data: null, message: 'Tidak ada shift aktif' });
    }

    res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    console.error('\n❌ ERROR GET ACTIVE SHIFT:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 2. Buka Shift Baru
const openShift = async (req, res) => {
  try {
    const userId = req.user.id;
    const { starting_cash } = req.body;

    // Pastikan tidak ada shift open yang dobel
    const checkActive = await db.query(
      "SELECT id FROM shifts WHERE user_id = $1 AND status = 'open'",
      [userId]
    );

    if (checkActive.rows.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Anda masih memiliki shift yang belum ditutup!' });
    }

    const result = await db.query(
      "INSERT INTO shifts (user_id, starting_cash, status) VALUES ($1, $2, 'open') RETURNING *",
      [userId, starting_cash || 0]
    );

    res.status(201).json({ status: 'success', message: 'Shift berhasil dibuka', data: result.rows[0] });
  } catch (error) {
    console.error('\n❌ ERROR OPEN SHIFT:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 3. Tutup Shift
const closeShift = async (req, res) => {
  try {
    const userId = req.user.id;
    const { actual_cash } = req.body;

    const shift = await db.query(
      "SELECT * FROM shifts WHERE user_id = $1 AND status = 'open' LIMIT 1",
      [userId]
    );

    if (shift.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Tidak ada shift aktif untuk ditutup' });
    }

    const shiftId = shift.rows[0].id;
    const startingCash = Number(shift.rows[0].starting_cash);

    const sales = await db.query(
      "SELECT COALESCE(SUM(total), 0) as total_cash_sales FROM transactions WHERE shift_id = $1 AND payment_method = 'tunai'",
      [shiftId]
    );

    const totalCashSales = Number(sales.rows[0].total_cash_sales);
    const expectedCash = startingCash + totalCashSales;

    const closedShift = await db.query(
      `UPDATE shifts 
       SET end_time = CURRENT_TIMESTAMP, actual_cash = $1, expected_cash = $2, status = 'closed', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 RETURNING *`,
      [actual_cash || 0, expectedCash, shiftId]
    );

    res.status(200).json({ 
      status: 'success', 
      message: 'Shift berhasil ditutup', 
      data: closedShift.rows[0] 
    });
  } catch (error) {
    console.error('\n❌ ERROR CLOSE SHIFT:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 4. FUNGSI BARU: Ambil Semua Riwayat Shift untuk Audit (Digabung dengan nama Kasir)
const getAllShifts = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.*, u.name as cashier_name 
      FROM shifts s 
      LEFT JOIN users u ON s.user_id = u.id 
      ORDER BY s.created_at DESC
    `);
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (error) {
    console.error('\n❌ ERROR GET ALL SHIFTS:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = { getActiveShift, openShift, closeShift, getAllShifts };