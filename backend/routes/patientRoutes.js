const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(protect);
// Membuka akses untuk admin & owner agar bisa mengelola CRM
router.use(authorizeRoles('superadmin', 'owner', 'admin', 'kasir')); 

router.get('/', patientController.getPatients);
router.post('/', patientController.addPatient);
router.put('/:id', patientController.updatePatient);       // Rute Edit Baru
router.delete('/:id', patientController.deletePatient); // Rute Hapus Baru

module.exports = router;