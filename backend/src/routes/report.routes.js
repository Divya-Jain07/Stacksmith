const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authorize } = require('../middlewares/auth.middleware');

// GET /api/reports/dashboard - Full analytics dashboard payload
router.get('/dashboard', authorize('SuperAdmin', 'Admin', 'Librarian'), reportController.getDashboard);

module.exports = router;
