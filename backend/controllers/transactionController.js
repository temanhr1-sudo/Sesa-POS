const transactionService = require('../services/transactionService');

const checkout = async (req, res) => {
  try {
    // req.user didapat dari token JWT, jadi kita tahu siapa kasir yang bertugas
    const result = await transactionService.createTransaction(req.body, req.user.id);
    res.status(201).json({ status: 'success', message: 'Transaksi berhasil diproses', data: result });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = { checkout };