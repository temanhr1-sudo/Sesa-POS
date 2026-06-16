const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(protect);
// Mengizinkan Superadmin, Owner, dan Admin untuk melihat dashboard
router.use(authorizeRoles('superadmin', 'owner', 'admin')); 

router.get('/', dashboardController.getStats);

module.exports = router;