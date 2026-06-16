const userService = require('../services/userService');

const getUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json({ status: 'success', data: users });
  } catch (error) {
    console.error('\n❌ ERROR GET USERS:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const addUser = async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ status: 'success', message: 'Pengguna berhasil ditambahkan', data: user });
  } catch (error) {
    console.error('\n❌ ERROR ADD USER:', error.message);
    if (error.code === '23505') { // 23505 adalah kode error PostgreSQL untuk Unique Violation (Duplikat)
      return res.status(400).json({ status: 'error', message: 'Alamat email ini sudah terdaftar!' });
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.status(200).json({ status: 'success', message: 'Data pengguna berhasil diperbarui', data: user });
  } catch (error) {
    console.error('\n❌ ERROR UPDATE USER:', error.message);
    if (error.code === '23505') return res.status(400).json({ status: 'error', message: 'Alamat email ini sudah dipakai pengguna lain!' });
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    await userService.deleteUser(req.params.id);
    res.status(200).json({ status: 'success', message: 'Akun pengguna berhasil dihapus permanen' });
  } catch (error) {
    console.error('\n❌ ERROR DELETE USER:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = { getUsers, addUser, updateUser, deleteUser };