const express = require('express');
const router = express.Router();
const cashflowController = require('../controllers/cashflowController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(protect);
// Hanya Superadmin (Owner) dan peran Finance yang diberi izin akses arus kas utama
router.use(authorizeRoles('superadmin', 'finance')); 

router.get('/', cashflowController.getCashflow);
router.post('/', cashflowController.addCashflowTransaction);

module.exports = router;