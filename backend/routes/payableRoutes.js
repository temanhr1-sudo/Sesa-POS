const express = require('express');
const router = express.Router();
const payableController = require('../controllers/payableController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(protect);
router.use(authorizeRoles('superadmin', 'logistik')); 

router.get('/', payableController.getPayables);
router.post('/', payableController.addPayable);
router.put('/:id/status', payableController.updatePayableStatus);
router.delete('/:id', payableController.deletePayable);

module.exports = router;