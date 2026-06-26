const express = require('express');
const router = express.Router();
const borrowController = require('../controllers/borrow.controller');
const { authorize, requireSelfOrStaff } = require('../middlewares/auth.middleware');

// --- Member Self-Service ---
router.post('/self', requireSelfOrStaff(), borrowController.memberReserveBook);
router.delete('/:id/cancel', requireSelfOrStaff({ skipIdCheck: true }), borrowController.cancelCatalogHold);

// POST /api/reservations - Add member to FIFO hold queue for a book (Walk-in / Staff)
router.post('/', authorize('Admin', 'Librarian', 'SuperAdmin'), borrowController.createReservation);

module.exports = router;
