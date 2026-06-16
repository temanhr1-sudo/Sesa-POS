const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(protect);

// Gembok baru: Kini Superadmin dan Kasir bisa mengakses data piutang ini
router.use(authorizeRoles('superadmin', 'kasir')); 

router.get('/', financeController.getReceivables);
router.post('/:id/collect', financeController.collectReceivable);

module.exports = router;