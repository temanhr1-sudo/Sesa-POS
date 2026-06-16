const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(protect);
// PENGAMANAN KETAT: Hanya superadmin pemegang kuasa tertinggi yang bisa menambah akun kasir/logistik
router.use(authorizeRoles('superadmin')); 

router.get('/', userController.getUsers);
router.post('/', userController.addUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;