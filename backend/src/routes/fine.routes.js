const express = require('express');
const router = express.Router();
const fineController = require('../controllers/fine.controller');
const { authorize, requireSelfOrStaff } = require('../middlewares/auth.middleware');

// GET /api/fines/member/:memberId - Get all fines for a member
router.get('/member/:memberId', requireSelfOrStaff(), fineController.getFines);

// POST /api/fines/:id/pay - Collect payment for a fine
router.post('/:id/pay', authorize('SuperAdmin', 'Admin', 'Librarian'), fineController.collectFine);

// POST /api/fines/:id/waive - Waive / write-off a fine (Admin only)
router.post('/:id/waive', authorize('SuperAdmin', 'Admin'), fineController.waiveFine);

module.exports = router;
