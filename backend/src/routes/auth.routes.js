const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { auth, authorize } = require('../middlewares/auth.middleware');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

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
router.post('/staff-login', loginLimiter, authController.staffLogin);

// POST /api/auth/member-login
router.post('/member-login', loginLimiter, authController.memberLogin);

// PUT /api/auth/change-password
// Requires logged in user
router.put('/change-password', auth, authController.changePassword);

module.exports = router;
