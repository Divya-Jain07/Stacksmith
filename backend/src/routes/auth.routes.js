const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { auth, authorize } = require('../middlewares/auth.middleware');

// POST /api/auth/register
// Open endpoint to create the FIRST SuperAdmin ONLY. Fails if one exists.
router.post('/register', authController.registerSuperAdmin);

// POST /api/auth/create-admin
// Protected endpoint for SuperAdmins to create branch Admins
router.post('/create-admin', auth, authorize('SuperAdmin'), authController.createAdmin);

// POST /api/auth/create-librarian
// Protected endpoint for Admins to create Librarians
router.post('/create-librarian', auth, authorize('Admin'), authController.createLibrarian);

// POST /api/auth/staff-login
router.post('/staff-login', authController.staffLogin);

// POST /api/auth/member-login
router.post('/member-login', authController.memberLogin);

// PUT /api/auth/change-password
// Requires logged in user
router.put('/change-password', auth, authController.changePassword);

module.exports = router;
