const express = require('express');
const router = express.Router();
const memberController = require('../controllers/member.controller');
const { authorize, requireSelfOrStaff } = require('../middlewares/auth.middleware');

// Self-Service Routes (must be before /:id)
router.get('/me/borrowings', requireSelfOrStaff(), memberController.getMyBorrowings);
router.get('/me/fines', requireSelfOrStaff(), memberController.getMyFines);

// POST  /api/members     - Register a new member (Staff only)
// GET   /api/members     - List all members (Staff only)
router.route('/')
  .post(authorize('SuperAdmin', 'Admin', 'Librarian'), memberController.createMember)
  .get(authorize('SuperAdmin', 'Admin', 'Librarian'), memberController.getMembers);

// GET   /api/members/:id  - Get member profile with stats & history (Self or Staff)
// PUT   /api/members/:id  - Update member details (Self or Staff)
router.route('/:id')
  .get(requireSelfOrStaff(), memberController.getMemberById)
  .put(requireSelfOrStaff(), memberController.updateMember);

module.exports = router;
