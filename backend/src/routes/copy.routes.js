const express = require('express');
const router = express.Router();
const bookController = require('../controllers/book.controller');
const { authorize } = require('../middlewares/auth.middleware');

// PUT /api/copies/:barcode - Update a copy's condition or status manually
router.put('/:barcode', authorize('SuperAdmin', 'Admin', 'Librarian'), bookController.updateCopy);

module.exports = router;
