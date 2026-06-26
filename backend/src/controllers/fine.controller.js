const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const Fine = require('../models/Fine');
const LibrarianStaff = require('../models/LibrarianStaff');

// Collect Fine Payment
exports.collectFine = catchAsync(async (req, res, next) => {
    const { paymentMode } = req.body;
    const filter = { _id: req.params.id, status: 'pending', ...(req.tenantFilter || {}) };
    const fine = await Fine.findOne(filter);

    if (!fine) throw new ApiError(404, 'Fine not found');

    const staff = await LibrarianStaff.findOne({ userId: req.user.id });
    if (!staff) throw new ApiError(404, 'Staff not found');

    fine.status = 'collected';
    fine.paymentMode = paymentMode || 'Cash';
    fine.collectedAt = new Date();
    fine.paymentCollectedBy = staff._id;
    await fine.save();

    res.json({ message: 'Fine collected successfully.', fine });
  });

// Waive Fine (Admin only)
exports.waiveFine = catchAsync(async (req, res, next) => {
    const filter = { _id: req.params.id, status: 'pending', ...(req.tenantFilter || {}) };
    const fine = await Fine.findOne(filter);
    if (!fine) throw new ApiError(404, 'Fine not found');

    // Ensure only Admin can waive (SuperAdmin or Admin of this scope)
    if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
      throw new ApiError(403, 'Forbidden');
    }

    fine.status = 'left';
    fine.reason = 'waived by admin';
    await fine.save();

    res.json({ message: 'Fine waived successfully.', fine });
  });

// Get Fines for a Member
exports.getFines = catchAsync(async (req, res, next) => {
    const filter = { borrowedUser: req.params.memberId, ...(req.tenantFilter || {}) };
    const fines = await Fine.find(filter).sort({ createdAt: -1 });
    res.json(fines);
  });
