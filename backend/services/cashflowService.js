const db = require('../config/db');

const getCashflows = async (filters) => {
  let query = 'SELECT * FROM cashflow WHERE 1=1';
  const values = [];
  let counter = 1;

  if (filters.type) {
    query += ` AND type = $${counter}`;
    values.push(filters.type);
    counter++;
  }
  
  if (filters.date_from) {
    query += ` AND date >= $${counter}`;
    values.push(filters.date_from);
    counter++;
  }

  if (filters.date_to) {
    query += ` AND date <= $${counter}`;
    values.push(filters.date_to);
    counter++;
  }

  query += ' ORDER BY date DESC, created_at DESC';
  
  const result = await db.query(query, values);
  return result.rows;
};

const addManualCashflow = async (data, user_id) => {
  const { type, amount, category, description, date } = data;
  
  const query = `
    INSERT INTO cashflow (type, amount, category, description, date, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  
  const values = [
    type, 
    amount, 
    category, 
    description || null, 
    date || new Date().toISOString().slice(0, 10), 
    user_id
  ];

  const result = await db.query(query, values);
  return result.rows[0];
};

module.exports = { getCashflows, addManualCashflow };