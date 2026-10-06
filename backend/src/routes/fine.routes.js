const express = require('express');
const router = express.Router();
const fineController = require('../controllers/fine.controller');
const { authorize, requireSelfOrStaff } = require('../middlewares/auth.middleware');

// GET /api/fines - List all fines for the branch (staff only)
// Must be BEFORE /:memberId route to avoid being shadowed
router.get('/', authorize('SuperAdmin', 'Admin', 'Librarian'), fineController.listBranchFines);

// GET /api/fines/member/:memberId - Get all fines for a specific member
router.get('/member/:memberId', requireSelfOrStaff(), fineController.getFines);

// POST /api/fines/:id/pay - Collect payment for a fine (cash only)
router.post('/:id/pay', authorize('SuperAdmin', 'Admin', 'Librarian'), fineController.collectFine);

// POST /api/fines/:id/waive - Waive / write-off a fine (Admin / SuperAdmin only)
router.post('/:id/waive', authorize('SuperAdmin', 'Admin'), fineController.waiveFine);

module.exports = router;
