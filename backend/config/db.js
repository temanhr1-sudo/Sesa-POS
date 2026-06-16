const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('connect', () => {
  console.log('Terkoneksi ke database PostgreSQL (Supabase)');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err.stack);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};