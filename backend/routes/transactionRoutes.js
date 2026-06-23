const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect); // Hanya kasir/admin login yang bisa memproses transaksi

router.get('/', transactionController.getTransactions);
router.post('/', transactionController.checkout);
router.post('/:id/return', transactionController.returnTransaction); // Rute baru untuk Eksekusi Retur

module.exports = router;