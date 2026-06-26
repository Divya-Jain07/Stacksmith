const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { auth, authorize } = require('../middlewares/auth.middleware');

// GET /api/admin/stats - Aggregate stats (SuperAdmin only)
router.get('/stats', authorize('SuperAdmin'), adminController.getAggregateStats);

// GET /api/admin/librarians - List all librarians in admin's branch
router.get('/librarians', authorize('Admin'), adminController.getLibrarians);

// DELETE /api/admin/librarians/:id - Delete a librarian
router.delete('/librarians/:id', authorize('Admin'), adminController.deleteLibrarian);

// PUT /api/admin/:id - Update an Admin
router.put('/:id', authorize('SuperAdmin'), adminController.updateAdmin);

// DELETE /api/admin/:id - Delete an Admin
router.delete('/:id', authorize('SuperAdmin'), adminController.deleteAdmin);

module.exports = router;
