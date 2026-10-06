const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const Fine = require('../models/Fine');
const Member = require('../models/Member');
const BorrowingHistory = require('../models/BorrowingHistory');
const Book = require('../models/Book');
const LibrarianStaff = require('../models/LibrarianStaff');
const { calculateOverdueFine } = require('../utils/fineCalculator');

// Shared status label map (stored value → display label)
const STATUS_LABELS = { pending: 'Pending', collected: 'Collected', left: 'Waived' };

// Shared sort map
const SORT_MAP = {
  newest:  { createdAt: -1 },
  oldest:  { createdAt: 1 },
  highest: { amountToPay: -1 }
};

// Shared days-overdue calculator (matches fineCalculator's "started day counts")
const calcDaysOverdue = (dueDate, returnedDate) => {
  if (!dueDate || !returnedDate) return 0;
  const due  = new Date(dueDate);
  const ret  = new Date(returnedDate);
  if (ret <= due) return 0;
  return Math.ceil((ret - due) / (1000 * 60 * 60 * 24));
};

// Helper to escape regex special chars
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ─── List fines for a branch ──────────────────────────────────────────────────
exports.listBranchFines = catchAsync(async (req, res) => {
  const adminId = req.tenantFilter?.adminId;
  if (!adminId) throw new ApiError(400, 'Branch selection required');

  const {
    status = 'pending',
    reason,
    search,
    memberId,
    from,
    to,
    sort = 'newest',
    page = 1,
    limit = 20
  } = req.query;

  // Validate pagination
  const parsedPage  = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  // Build fine filter
  const filter = { adminId };

  // Status mapping: 'waived' → 'left'; 'all' → no filter
  if (status === 'waived') {
    filter.status = 'left';
  } else if (status !== 'all') {
    filter.status = status; // 'pending' | 'collected'
  }

  if (reason && ['overdue', 'lost', 'damaged'].includes(reason)) {
    filter.reason = reason;
  }

  // Date range
  if (from || to) {
    filter.createdAt = {};
    if (from) {
      const d = new Date(from);
      if (isNaN(d.getTime())) throw new ApiError(400, 'Invalid "from" date');
      filter.createdAt.$gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (isNaN(d.getTime())) throw new ApiError(400, 'Invalid "to" date');
      d.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = d;
    }
  }

  // Member filters
  if (memberId) {
    filter.borrowedUser = memberId;
  } else if (search && search.trim()) {
    const safe = escapeRegex(search.trim().slice(0, 200));
    const regex = new RegExp(safe, 'i');
    const matchedMembers = await Member.find({
      adminId,
      $or: [{ name: regex }, { memberCode: regex }]
    }).select('_id').lean();
    filter.borrowedUser = { $in: matchedMembers.map(m => m._id) };
  }

  const sortObj = SORT_MAP[sort] || SORT_MAP.newest;
  const skip    = (parsedPage - 1) * parsedLimit;

  // Summary (always scoped to branch, ignores filters/page)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [summaryAgg] = await Fine.aggregate([
    { $match: { adminId } },
    {
      $group: {
        _id: null,
        pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        pendingTotal: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amountToPay', 0] } },
        collectedThisMonth: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$status', 'collected'] }, { $gte: ['$collectedAt', startOfMonth] }] },
              '$amountToPay',
              0
            ]
          }
        }
      }
    }
  ]).crossTenant('branch-summary');

  const summary = summaryAgg || { pendingCount: 0, pendingTotal: 0, collectedThisMonth: 0 };

  const [total, fines] = await Promise.all([
    Fine.countDocuments(filter),
    Fine.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(parsedLimit)
      .populate({ path: 'borrowedUser', select: 'name memberCode', match: { adminId } })
      .populate({
        path: 'borrowingId',
        select: 'dueDate returnedDate',
        match: { adminId }
      })
      .populate({ path: 'paymentCollectedBy', select: 'staffId name', match: { adminId } })
      .populate({ path: 'waivedBy', select: 'name email' })
      .lean()
  ]);

  // Enrich with book title + daysOverdue
  const borrowingIds = fines.map(f => f.borrowingId?._id).filter(Boolean);
  const borrowings = await BorrowingHistory.find({ _id: { $in: borrowingIds }, adminId }).populate({ path: 'bookCopyId', select: 'bookId', match: { adminId } }).lean();
  const borrowingMap = {};
  for (const bw of borrowings) {
    borrowingMap[String(bw._id)] = bw;
  }

  const bookIds = borrowings.map(bw => bw.bookCopyId?.bookId).filter(Boolean);
  const books = await Book.find({ _id: { $in: bookIds }, adminId }).select('name').lean();
  const bookMap = {};
  for (const b of books) bookMap[String(b._id)] = b.name;

  const enrichedFines = fines.map(f => {
    const bw = borrowingMap[String(f.borrowingId?._id)];
    const bookName = bw?.bookCopyId?.bookId ? bookMap[String(bw.bookCopyId.bookId)] : null;
    const daysOverdue = calcDaysOverdue(f.borrowingId?.dueDate, f.borrowingId?.returnedDate);
    return {
      ...f,
      bookTitle: bookName || '(Book deleted)',
      daysOverdue: Math.max(0, daysOverdue),
      statusLabel: STATUS_LABELS[f.status] || f.status
    };
  });

  res.json({
    fines: enrichedFines,
    page: parsedPage,
    limit: parsedLimit,
    total,
    totalPages: Math.ceil(total / parsedLimit),
    summary: {
      pendingCount: summary.pendingCount,
      pendingTotal: summary.pendingTotal,
      collectedThisMonth: summary.collectedThisMonth
    }
  });
});

// ─── Collect Fine Payment (atomic, cash only) ─────────────────────────────────
exports.collectFine = catchAsync(async (req, res) => {
  const adminId = req.tenantFilter?.adminId;

  // Staff profile is only for Librarians — Admins/SuperAdmins have no LibrarianStaff record
  let staffId = null;
  if (req.user.role === 'Librarian') {
    const staff = await LibrarianStaff.findOne({ userId: req.user.id, adminId });
    if (!staff) throw new ApiError(404, 'Staff profile not found');
    staffId = staff._id;
  }

  const fine = await Fine.findOneAndUpdate(
    { _id: req.params.id, status: 'pending', adminId },
    {
      $set: {
        status: 'collected',
        paymentMode: 'Cash',
        collectedAt: new Date(),
        ...(staffId ? { paymentCollectedBy: staffId } : {})
      }
    },
    { new: true }
  );

  if (!fine) throw new ApiError(409, 'Fine not found or already processed');

  res.json({ message: 'Fine collected successfully.', fine });
});

// ─── Waive Fine (Admin / SuperAdmin only) ────────────────────────────────────
exports.waiveFine = catchAsync(async (req, res) => {
  const adminId = req.tenantFilter?.adminId;
  const { waiverReason } = req.body;

  if (!waiverReason || waiverReason.trim().length < 3) {
    throw new ApiError(400, 'A waiver reason of at least 3 characters is required');
  }
  if (waiverReason.trim().length > 200) {
    throw new ApiError(400, 'Waiver reason must be 200 characters or fewer');
  }

  const fine = await Fine.findOneAndUpdate(
    { _id: req.params.id, status: 'pending', adminId },
    {
      $set: {
        status: 'left',
        waivedAt: new Date(),
        waivedBy: req.user.id,
        waiverReason: waiverReason.trim()
        // reason (overdue/lost/damaged) is intentionally NOT touched
      }
    },
    { new: true }
  );

  if (!fine) throw new ApiError(409, 'Fine not found or already processed');

  res.json({ message: 'Fine waived successfully.', fine });
});

// ─── Get Fines for a Member ───────────────────────────────────────────────────
exports.getFines = catchAsync(async (req, res) => {
  const filter = { borrowedUser: req.params.memberId, ...(req.tenantFilter || {}) };
  const fines = await Fine.find(filter).sort({ createdAt: -1 }).lean();
  const enriched = fines.map(f => ({ ...f, statusLabel: STATUS_LABELS[f.status] || f.status }));
  res.json(enriched);
});
