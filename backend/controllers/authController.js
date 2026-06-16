const authService = require('../services/authService');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validasi agar tidak ada yang mencoba login dengan form kosong
    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Email dan kata sandi wajib diisi' });
    }

    // Panggil service untuk login, kali ini dengan membawa password
    const data = await authService.loginUser(email, password);
    
    res.status(200).json({
      status: 'success',
      message: 'Login berhasil',
      data
    });
  } catch (error) {
    res.status(401).json({ status: 'error', message: error.message });
  }
};

module.exports = { login };