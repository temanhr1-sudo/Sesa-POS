const db = require('../config/db');

const getPayables = async (req, res) => {
  try {
    // Urutkan dari tenggat waktu (jatuh tempo) yang paling dekat
    const result = await db.query('SELECT * FROM payables ORDER BY status ASC, due_date ASC');
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const addPayable = async (req, res) => {
  try {
    const { supplier_name, invoice_number, amount, due_date, notes } = req.body;
    const result = await db.query(
      `INSERT INTO payables (supplier_name, invoice_number, amount, due_date, notes) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [supplier_name, invoice_number || null, amount, due_date || null, notes || null]
    );
    res.status(201).json({ status: 'success', message: 'Tagihan/Hutang berhasil dicatat', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const updatePayableStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'paid' atau 'pending'
    const result = await db.query(
      `UPDATE payables SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );
    res.status(200).json({ status: 'success', message: 'Status hutang berhasil diperbarui', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const deletePayable = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM payables WHERE id = $1', [id]);
    res.status(200).json({ status: 'success', message: 'Data tagihan berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = { getPayables, addPayable, updatePayableStatus, deletePayable };