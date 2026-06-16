const db = require('../config/db');

const getAllPatients = async (search) => {
  let query = 'SELECT * FROM patients WHERE 1=1';
  const values = [];
  
  if (search) {
    query += ' AND (name ILIKE $1 OR patient_code ILIKE $1 OR phone ILIKE $1)';
    values.push(`%${search}%`);
  }
  
  query += ' ORDER BY created_at DESC';
  const result = await db.query(query, values);
  return result.rows;
};

const createPatient = async (data) => {
  // Generate ID Pasien Format: P-00001 (KODEMU DIPERTAHANKAN)
  const countRes = await db.query('SELECT COUNT(*) FROM patients');
  const count = parseInt(countRes.rows[0].count) + 1;
  const patient_code = `P-${count.toString().padStart(5, '0')}`;

  const { name, phone, email, gender, address, dob, allergies, notes } = data;
  const skin_conditions = data.skin_conditions ? `{${data.skin_conditions.join(',')}}` : '{}';

  // Alamat dari Frontend akan digabung ke kolom notes agar tidak error di Database
  const finalNotes = address ? `Alamat: ${address}\n${notes || ''}` : (notes || null);

  const query = `
    INSERT INTO patients (patient_code, name, phone, email, gender, dob, skin_conditions, allergies, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;
  
  const values = [
    patient_code, name, phone, email || null, gender || null, 
    dob || null, skin_conditions, allergies || null, finalNotes
  ];

  const result = await db.query(query, values);
  return result.rows[0];
};

const updatePatient = async (id, data) => {
  const { name, phone, email, gender, address, dob, allergies, notes } = data;
  const skin_conditions = data.skin_conditions ? `{${data.skin_conditions.join(',')}}` : '{}';
  
  const finalNotes = address ? `Alamat: ${address}\n${notes || ''}` : (notes || null);

  const query = `
    UPDATE patients 
    SET name = $1, phone = $2, email = $3, gender = $4, dob = $5, 
        skin_conditions = $6, allergies = $7, notes = $8, updated_at = CURRENT_TIMESTAMP
    WHERE id = $9 RETURNING *;
  `;

  const values = [
    name, phone, email || null, gender || null, dob || null, 
    skin_conditions, allergies || null, finalNotes, id
  ];

  const result = await db.query(query, values);
  if (result.rows.length === 0) throw new Error('Data pasien tidak ditemukan');
  return result.rows[0];
};

const deletePatient = async (id) => {
  const result = await db.query('DELETE FROM patients WHERE id = $1 RETURNING *', [id]);
  if (result.rows.length === 0) throw new Error('Data pasien tidak ditemukan');
  return result.rows[0];
};

module.exports = { getAllPatients, createPatient, updatePatient, deletePatient };