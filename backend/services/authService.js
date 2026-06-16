const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const loginUser = async (email, password) => {
  // 1. Cari user berdasarkan email dan pastikan akunnya aktif
  const result = await db.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);
  
  if (result.rows.length === 0) {
    // Pesan error disamarkan agar hacker tidak tahu apakah emailnya yang salah atau passwordnya
    throw new Error('Kredensial tidak valid atau akun tidak aktif');
  }

  const user = result.rows[0];

  // 2. Verifikasi kesesuaian Password menggunakan bcrypt
  // Jika password di database masih kosong (null), otomatis akan ditolak
  if (!user.password) {
    throw new Error('Akun belum memiliki kata sandi yang diatur');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  
  if (!isMatch) {
    throw new Error('Kredensial tidak valid atau akun tidak aktif');
  }

  // 3. Generate JWT Token
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '12h' } // Token valid untuk 12 jam (1 shift kerja)
  );

  // 4. Return data user dan token (JANGAN PERNAH MENGEMBALIKAN PASSWORD KE FRONTEND)
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    token
  };
};

module.exports = { loginUser };