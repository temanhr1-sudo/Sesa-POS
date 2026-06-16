const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      // Verifikasi token menggunakan secret key dari .env
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Masukkan data user dari token ke dalam request
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ status: 'error', message: 'Sesi tidak valid atau token kadaluarsa' });
    }
  }

  if (!token) {
    res.status(401).json({ status: 'error', message: 'Akses ditolak, tidak ada token' });
  }
};

// Middleware BARU: Sangat fleksibel untuk mengecek banyak role sekaligus
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ status: 'error', message: 'Akses ditolak, jabatan Anda tidak memiliki izin ke area ini' });
    }
  };
};

// Diperbarui: Sekarang mencari 'superadmin' sesuai database terbaru
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    next();
  } else {
    res.status(403).json({ status: 'error', message: 'Akses ditolak, khusus Superadmin' });
  }
};

module.exports = { protect, adminOnly, authorizeRoles };