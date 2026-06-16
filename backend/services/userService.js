const db = require('../config/db');
const bcrypt = require('bcryptjs'); // Pastikan library ini sudah terinstall (npm install bcryptjs)

const getAllUsers = async () => {
  const result = await db.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
  return result.rows;
};

const createUser = async (data) => {
  const { name, email, password, role } = data;
  
  // Enkripsi password sebelum masuk ke database
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const result = await db.query(
    'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
    [name, email, hashedPassword, role]
  );
  return result.rows[0];
};

const updateUser = async (id, data) => {
  const { name, email, role, password } = data;
  let query, values;

  // Jika admin juga mengganti password pengguna tersebut
  if (password && password.trim() !== '') {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    query = `UPDATE users SET name = $1, email = $2, role = $3, password = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING id, name, email, role`;
    values = [name, email, role, hashedPassword, id];
  } else {
    // Jika hanya mengubah nama/email/role tanpa sentuh password
    query = `UPDATE users SET name = $1, email = $2, role = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, name, email, role`;
    values = [name, email, role, id];
  }

  const result = await db.query(query, values);
  if (result.rows.length === 0) throw new Error('Pengguna tidak ditemukan');
  return result.rows[0];
};

const deleteUser = async (id) => {
  const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) throw new Error('Pengguna tidak ditemukan');
  return result.rows[0];
};

module.exports = { getAllUsers, createUser, updateUser, deleteUser };