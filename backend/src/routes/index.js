const express = require('express');
const router = express.Router();

const adminRoutes       = require('./admin.routes');
const authRoutes        = require('./auth.routes');
const bookRoutes        = require('./book.routes');
const copyRoutes        = require('./copy.routes');
const memberRoutes      = require('./member.routes');
const borrowRoutes      = require('./borrow.routes');
const reservationRoutes = require('./reservation.routes');
const fineRoutes        = require('./fine.routes');
const reportRoutes      = require('./report.routes');
const chatRoutes        = require('./chat.routes');

const { auth } = require('../middlewares/auth.middleware');
const { tenantScope } = require('../middlewares/tenant.middleware');

// Public route (Auth handles its own protection internally for some endpoints)
router.use('/auth',         authRoutes);

// Protected routes (Tenant scoped)
router.use(auth);
router.use(tenantScope);

router.use('/admin',        adminRoutes);
router.use('/books',        bookRoutes);
router.use('/copies',       copyRoutes);
router.use('/members',      memberRoutes);
router.use('/borrow',       borrowRoutes);
router.use('/reservations', reservationRoutes);
router.use('/fines',        fineRoutes);
router.use('/reports',      reportRoutes);
router.use('/chat',         chatRoutes);

module.exports = router;

