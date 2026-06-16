const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect); // Hanya kasir/admin login yang bisa memproses transaksi

router.post('/', transactionController.checkout);

module.exports = router;