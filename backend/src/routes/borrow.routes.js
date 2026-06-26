const express = require('express');
const router = express.Router();
const borrowController = require('../controllers/borrow.controller');
const { authorize, requireSelfOrStaff } = require('../middlewares/auth.middleware');

// --- Member Self-Service ---
router.post('/request', requireSelfOrStaff(), borrowController.memberRequestBook);
router.delete('/:id/cancel', requireSelfOrStaff({ skipIdCheck: true }), borrowController.cancelMemberRequest);

// --- Walk-in / Direct Issue (Staff Only) ---
router.post('/issue', authorize('Admin', 'Librarian', 'SuperAdmin'), borrowController.issueBook);
router.post('/return', authorize('Admin', 'Librarian', 'SuperAdmin'), borrowController.returnBook);
router.post('/renew', authorize('Admin', 'Librarian', 'SuperAdmin'), borrowController.renewBorrowing);

// --- Librarian Confirmations (Staff Only) ---
router.get('/pending', authorize('Admin', 'Librarian', 'SuperAdmin'), borrowController.getPendingRequests);
router.patch('/:id/confirm-issue', authorize('Admin', 'Librarian', 'SuperAdmin'), borrowController.confirmIssue);
router.patch('/:id/confirm-return', authorize('Admin', 'Librarian', 'SuperAdmin'), borrowController.confirmReturn);

// --- DEBUG ---
router.get('/debug/:barcode', async (req, res) => {
  const BookCopy = require('../models/BookCopy');
  const copy = await BookCopy.findOne({ barcode: req.params.barcode });
  res.json({ copy });
});

module.exports = router;
