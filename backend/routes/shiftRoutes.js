const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(protect);

// Rute operasional kasir
router.get('/active', shiftController.getActiveShift);
router.post('/open', shiftController.openShift);
router.post('/close', shiftController.closeShift);

// RUTE BARU: Audit riwayat shift (hanya untuk level manajemen)
router.get('/history', authorizeRoles('superadmin', 'owner', 'admin'), shiftController.getAllShifts);

module.exports = router;