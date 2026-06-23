const transactionService = require('../services/transactionService');

const getTransactions = async (req, res) => {
  try {
    const data = await transactionService.getAllTransactions();
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const checkout = async (req, res) => {
  try {
    const result = await transactionService.createTransaction(req.body, req.user.id);
    res.status(201).json({ status: 'success', message: 'Transaksi berhasil diproses', data: result });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const returnTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    // Kirim req.user.id untuk mencatat siapa yang membatalkan (log stok & arus kas)
    const result = await transactionService.returnTransaction(id, req.user.id);
    res.status(200).json({ status: 'success', message: 'Transaksi berhasil diretur', data: result });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = { getTransactions, checkout, returnTransaction };