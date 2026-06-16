const db = require('../config/db');

// --- HUTANG (PAYABLES) ---
const getPayables = async (status) => {
  let query = 'SELECT * FROM payables';
  const values = [];
  if (status) {
    query += ' WHERE status = $1';
    values.push(status);
  }
  query += ' ORDER BY created_at DESC';
  const result = await db.query(query, values);
  return result.rows;
};

const createPayable = async (data) => {
  const { supplier_name, invoice_no, total_amount, due_date, notes } = data;
  const result = await db.query(`
    INSERT INTO payables (supplier_name, invoice_no, total_amount, due_date, status, notes)
    VALUES ($1, $2, $3, $4, 'unpaid', $5) RETURNING *
  `, [supplier_name, invoice_no || null, total_amount, due_date || null, notes || null]);
  return result.rows[0];
};

const payPayable = async (id, amount, user_id) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN'); // Transaksi atomic
    
    const pRes = await client.query('SELECT * FROM payables WHERE id = $1', [id]);
    if (pRes.rows.length === 0) throw new Error('Data hutang tidak ditemukan');
    const payable = pRes.rows[0];

    const newPaidAmount = Number(payable.paid_amount) + Number(amount);
    let newStatus = 'partial';
    if (newPaidAmount >= Number(payable.total_amount)) newStatus = 'paid';

    // 1. Update status hutang
    const updateRes = await client.query(`
      UPDATE payables SET paid_amount = $1, status = $2 WHERE id = $3 RETURNING *
    `, [newPaidAmount, newStatus, id]);

    // 2. Catat otomatis ke Cashflow (Uang Keluar)
    await client.query(`
      INSERT INTO cashflow (type, amount, category, description, date, created_by)
      VALUES ('out', $1, 'Beli Barang / Stok', $2, CURRENT_DATE, $3)
    `, [amount, `Pembayaran hutang ke ${payable.supplier_name}`, user_id]);

    await client.query('COMMIT');
    return updateRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// --- PIUTANG (RECEIVABLES) ---
const getReceivables = async (status) => {
  let query = 'SELECT * FROM receivables';
  const values = [];
  if (status) {
    query += ' WHERE status = $1';
    values.push(status);
  }
  query += ' ORDER BY created_at DESC';
  const result = await db.query(query, values);
  return result.rows;
};

const collectReceivable = async (id, amount, user_id) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    const rRes = await client.query('SELECT * FROM receivables WHERE id = $1', [id]);
    if (rRes.rows.length === 0) throw new Error('Data piutang tidak ditemukan');
    const receivable = rRes.rows[0];

    const newPaidAmount = Number(receivable.paid_amount) + Number(amount);
    let newStatus = 'partial';
    if (newPaidAmount >= Number(receivable.total_amount)) newStatus = 'paid';

    // 1. Update status piutang
    const updateRes = await client.query(`
      UPDATE receivables SET paid_amount = $1, status = $2 WHERE id = $3 RETURNING *
    `, [newPaidAmount, newStatus, id]);

    // 2. Catat otomatis ke Cashflow (Uang Masuk)
    await client.query(`
      INSERT INTO cashflow (type, amount, category, description, date, created_by)
      VALUES ('in', $1, 'Penjualan', $2, CURRENT_DATE, $3)
    `, [amount, `Pelunasan piutang dari ${receivable.entity_name}`, user_id]);

    await client.query('COMMIT');
    return updateRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { getPayables, createPayable, payPayable, getReceivables, collectReceivable };