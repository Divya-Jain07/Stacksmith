const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const BorrowingHistory = require('../models/BorrowingHistory');
const BookCopy = require('../models/BookCopy');
const Member = require('../models/Member');
const LibrarianStaff = require('../models/LibrarianStaff');
const Book = require('../models/Book');
const Fine = require('../models/Fine');
const BookReservation = require('../models/BookReservation');
const { calculateOverdueFine } = require('../utils/fineCalculator');
const { runInTransaction } = require('../utils/transaction');

// Helper for Return & Confirm Return
const processReturn = async (borrowingId, adminId) => {
  return await runInTransaction(async (session) => {
    // 1. Move borrowing to Returned exactly once
    const borrowing = await BorrowingHistory.findOneAndUpdate(
      { _id: borrowingId, requestStatus: 'Active', returnedDate: null, adminId },
      { $set: { requestStatus: 'Returned', returnedDate: new Date() } },
      { new: true, session }
    );
    
    if (!borrowing) throw new ApiError(404, 'Active borrowing record not found or already returned');

    // 2. Move copy to available
    const copy = await BookCopy.findOneAndUpdate(
      { _id: borrowing.bookCopyId, status: 'borrowed', adminId },
      { $set: { status: 'available' } },
      { new: true, session }
    );
    
    if (!copy) throw new ApiError(404, 'Borrowed copy not found');

    // 3. Increment book counter
    await Book.updateOne(
      { _id: copy.bookId, adminId },
      { $inc: { availableCopies: 1 } },
      { session }
    );

    // 4. Create fine if overdue
    const fineAmount = calculateOverdueFine(borrowing.dueDate, borrowing.returnedDate);
    let fineId = null;
    if (fineAmount > 0) {
      const fineRecord = new Fine({
        borrowingId: borrowing._id,
        borrowedUser: borrowing.memberId,
        amountToPay: fineAmount,
        reason: 'overdue',
        adminId: borrowing.adminId
      });
      await fineRecord.save({ session });
      fineId = fineRecord._id;
    }

    // 5. Calculate days overdue (same rule as fineCalculator)
    const daysOverdue = fineAmount > 0 && borrowing.dueDate
      ? Math.ceil((borrowing.returnedDate - new Date(borrowing.dueDate)) / (1000 * 60 * 60 * 24))
      : 0;
    
    return { borrowing, copy, fineAmount, fineId, daysOverdue };
  });
};

// Issue a book copy to a member
exports.issueBook = catchAsync(async (req, res, next) => {
  const { barcode, memberCode, dueDate } = req.body;
  const adminId = req.tenantFilter?.adminId;
  
  if (!adminId) throw new ApiError(400, 'Tenant scope required');

  const parsedDueDate = new Date(dueDate);
  if (!dueDate || isNaN(parsedDueDate.getTime()) || parsedDueDate <= new Date()) {
    throw new ApiError(400, 'Invalid or past due date');
  }

  // Pre-checks (outside transaction to fail fast)
  const member = await Member.findOne({ memberCode, status: 'active', adminId });
  if (!member) throw new ApiError(404, 'Active member not found in your library scope');
  
  const activeBorrows = await BorrowingHistory.countDocuments({
    memberId: member._id,
    requestStatus: { $in: ['Requested', 'Active'] },
    adminId
  });
  if (activeBorrows >= member.borrowLimits) throw new ApiError(400, 'Borrow limit exceeded');

  let staffId = null;
  if (req.user.role === 'Librarian') {
    const staff = await LibrarianStaff.findOne({ userId: req.user.id, adminId });
    if (!staff) throw new ApiError(404, 'Librarian staff profile not found');
    staffId = staff._id;
  }

  const borrowing = await runInTransaction(async (session) => {
    // 1. Claim copy (conditional update)
    const copy = await BookCopy.findOneAndUpdate(
      { barcode, status: { $in: ['available', 'reserved'] }, adminId },
      { $set: { status: 'borrowed' } },
      { new: false, session } // Returns the old document so we know its previous status
    );

    if (!copy) {
      console.error('issueBook failed: copy not found or unavailable.', { barcode, adminId });
      throw new ApiError(400, 'Book copy not available or not found.');
    }

    const wasPreviouslyReserved = copy.status === 'reserved';

    if (wasPreviouslyReserved) {
      await BorrowingHistory.deleteMany({ bookCopyId: copy._id, requestStatus: 'Requested', adminId }, { session });
    } else {
      await Book.updateOne(
        { _id: copy.bookId, adminId },
        { $inc: { availableCopies: -1 } },
        { session }
      );
    }

    const newBorrowing = new BorrowingHistory({
      bookCopyId: copy._id,
      memberId: member._id,
      issuedBy: staffId,
      dueDate: parsedDueDate,
      borrowedDate: new Date(),
      requestStatus: 'Active',
      adminId: member.adminId
    });
    
    await newBorrowing.save({ session });
    return newBorrowing;
  });

  res.status(201).json({ message: 'Book issued successfully.', borrowing });
});

// Return a book copy
exports.returnBook = catchAsync(async (req, res, next) => {
  const { barcode } = req.body;
  const adminId = req.tenantFilter?.adminId;
  
  const copy = await BookCopy.findOne({ barcode, status: 'borrowed', adminId });
  if (!copy) throw new ApiError(404, 'Book copy not found or not borrowed');

  const borrowing = await BorrowingHistory.findOne({ bookCopyId: copy._id, returnedDate: null, adminId });
  if (!borrowing) throw new ApiError(404, 'Borrowing record not found');

  const result = await processReturn(borrowing._id, adminId);

  // Enrich response with book and member details
  const [book, member] = await Promise.all([
    Book.findOne({ _id: copy.bookId, adminId }).select('name').lean(),
    Member.findOne({ _id: result.borrowing.memberId, adminId }).select('name memberCode').lean()
  ]);

  res.json({
    message: 'Book returned successfully.',
    fineGenerated: result.fineAmount > 0 ? result.fineAmount : 0,
    fineAmount: result.fineAmount,
    fineId: result.fineId,
    daysOverdue: result.daysOverdue,
    bookTitle: book?.name || null,
    memberName: member?.name || null,
    memberCode: member?.memberCode || null,
    dueDate: result.borrowing.dueDate,
    returnedDate: result.borrowing.returnedDate
  });
});

// Create a reservation for a book
exports.createReservation = catchAsync(async (req, res, next) => {
  const { memberCode, bookId } = req.body;
  const adminId = req.tenantFilter?.adminId;

  const member = await Member.findOne({ memberCode, status: 'active', adminId });
  if (!member) throw new ApiError(404, 'Member not found');

  const reservation = new BookReservation({
    requestedUserId: member._id,
    bookId,
    adminId: member.adminId
  });

  await reservation.save();
  res.status(201).json({ message: 'Reservation created successfully.', reservation });
});

// Renew a borrowed book
exports.renewBorrowing = catchAsync(async (req, res, next) => {
  const { barcode, newDueDate, dueDate } = req.body;
  const targetDate = newDueDate || dueDate;
  const adminId = req.tenantFilter?.adminId;

  if (!targetDate) {
    throw new ApiError(400, 'Due date required');
  }

  const copy = await BookCopy.findOne({ barcode, status: 'borrowed', adminId });
  if (!copy) throw new ApiError(404, 'Borrowed copy not found');

  const borrowing = await BorrowingHistory.findOne({ bookCopyId: copy._id, returnedDate: null, adminId });
  if (!borrowing) throw new ApiError(404, 'Borrowing record not found');

  borrowing.dueDate = new Date(targetDate);
  await borrowing.save();

  res.json({ message: 'Book renewed successfully.', borrowing });
});

// --- Member Self-Service ---

// Member requests a book
exports.memberRequestBook = catchAsync(async (req, res, next) => {
  const { barcode, bookId } = req.body;
  const memberId = req.memberProfileId;
  const adminId = req.tenantFilter?.adminId;
  
  if (!memberId) throw new ApiError(401, 'Member not authenticated');

  const member = await Member.findOne({ _id: memberId, status: 'active', adminId });
  if (!member) throw new ApiError(404, 'Active member not found');

  const activeBorrows = await BorrowingHistory.countDocuments({
    memberId,
    requestStatus: { $in: ['Requested', 'Active'] },
    adminId
  });
  if (activeBorrows >= member.borrowLimits) {
    throw new ApiError(400, 'Borrow limit exceeded');
  }

  const borrowing = await runInTransaction(async (session) => {
    let copyQuery = { status: 'available', adminId };
    if (barcode) {
      copyQuery.barcode = barcode;
    } else if (bookId) {
      copyQuery.bookId = bookId;
    }

    const copy = await BookCopy.findOneAndUpdate(
      copyQuery,
      { $set: { status: 'reserved' } },
      { new: true, session }
    );

    if (!copy) throw new ApiError(404, 'No available copy found for this book');

    await Book.updateOne(
      { _id: copy.bookId, adminId },
      { $inc: { availableCopies: -1 } },
      { session }
    );

    const newBorrowing = new BorrowingHistory({
      bookCopyId: copy._id,
      memberId: member._id,
      requestStatus: 'Requested',
      adminId: member.adminId
    });
    await newBorrowing.save({ session });
    
    return newBorrowing;
  });

  res.status(201).json({ message: 'Book requested successfully.', borrowing });
});

// Member cancels request
exports.cancelMemberRequest = catchAsync(async (req, res, next) => {
  const memberId = req.memberProfileId;
  const adminId = req.tenantFilter?.adminId;
  
  await runInTransaction(async (session) => {
    const borrowing = await BorrowingHistory.findOneAndDelete(
      { _id: req.params.id, memberId, requestStatus: 'Requested', adminId },
      { session }
    );
    if (!borrowing) throw new ApiError(404, 'Borrowing request not found');

    const copy = await BookCopy.findOneAndUpdate(
      { _id: borrowing.bookCopyId, status: 'reserved', adminId },
      { $set: { status: 'available' } },
      { new: true, session }
    );

    if (copy) {
      await Book.updateOne(
        { _id: copy.bookId, adminId },
        { $inc: { availableCopies: 1 } },
        { session }
      );
    }
  });

  res.json({ message: 'Request cancelled successfully.' });
});

// Member reserves a book (catalog hold)
exports.memberReserveBook = catchAsync(async (req, res, next) => {
  const { bookId } = req.body;
  const memberId = req.memberProfileId;
  const adminId = req.tenantFilter?.adminId;
  
  if (!memberId) throw new ApiError(401, 'Member not authenticated');

  const member = await Member.findOne({ _id: memberId, adminId });
  if (!member) throw new ApiError(404, 'Member not found');

  const reservation = new BookReservation({
    requestedUserId: member._id,
    bookId,
    adminId: member.adminId
  });
  await reservation.save();
  res.status(201).json({ message: 'Reservation created successfully.', reservation });
});

// Member cancels catalog hold
exports.cancelCatalogHold = catchAsync(async (req, res, next) => {
  const memberId = req.memberProfileId;
  const adminId = req.tenantFilter?.adminId;
  const reservation = await BookReservation.findOneAndDelete({ _id: req.params.id, requestedUserId: memberId, adminId });
  if (!reservation) throw new ApiError(404, 'Reservation not found');
  res.json({ message: 'Reservation cancelled successfully.' });
});

// --- Librarian Confirmation Endpoints ---

// Get pending borrowing requests
exports.getPendingRequests = catchAsync(async (req, res, next) => {
  const pendingBorrows = await BorrowingHistory.find({ requestStatus: 'Requested', ...(req.tenantFilter || {}) })
    .populate({ path: 'memberId', select: 'name memberCode', match: req.tenantFilter || {} })
    .populate({
      path: 'bookCopyId',
      match: req.tenantFilter || {},
      populate: { path: 'bookId', select: 'name author', match: req.tenantFilter || {} }
    });
  res.json(pendingBorrows);
});

// Confirm a requested issue
exports.confirmIssue = catchAsync(async (req, res, next) => {
  const { dueDate } = req.body;
  const adminId = req.tenantFilter?.adminId;
  
  const parsedDueDate = new Date(dueDate);
  if (!dueDate || isNaN(parsedDueDate.getTime()) || parsedDueDate <= new Date()) {
    throw new ApiError(400, 'Invalid or past due date');
  }

  let staffId = null;
  if (req.user.role === 'Librarian') {
    const staff = await LibrarianStaff.findOne({ userId: req.user.id, adminId });
    if (!staff) throw new ApiError(404, 'Librarian staff profile not found');
    staffId = staff._id;
  }

  const borrowing = await runInTransaction(async (session) => {
    const bw = await BorrowingHistory.findOneAndUpdate(
      { _id: req.params.id, requestStatus: 'Requested', adminId },
      { 
        $set: { 
          requestStatus: 'Active',
          borrowedDate: new Date(),
          dueDate: parsedDueDate,
          issuedBy: staffId
        }
      },
      { new: true, session }
    );
    if (!bw) throw new ApiError(404, 'Borrowing request not found');

    const copy = await BookCopy.findOneAndUpdate(
      { _id: bw.bookCopyId, status: 'reserved', adminId },
      { $set: { status: 'borrowed' } },
      { new: true, session }
    );
    if (!copy) throw new ApiError(404, 'Reserved copy not found');

    // Note: Counter does not change here because it was already decremented when requested
    return bw;
  });

  res.json({ message: 'Book issue confirmed.', borrowing });
});

// Confirm a return (scanned by librarian)
exports.confirmReturn = catchAsync(async (req, res, next) => {
  const adminId = req.tenantFilter?.adminId;
  const result = await processReturn(req.params.id, adminId);

  const copy = await BookCopy.findOne({ _id: result.borrowing.bookCopyId, adminId }).lean();
  const [book, member] = await Promise.all([
    copy ? Book.findOne({ _id: copy.bookId, adminId }).select('name').lean() : null,
    Member.findOne({ _id: result.borrowing.memberId, adminId }).select('name memberCode').lean()
  ]);

  res.json({
    message: 'Book return confirmed.',
    fineGenerated: result.fineAmount > 0 ? result.fineAmount : 0,
    fineAmount: result.fineAmount,
    fineId: result.fineId,
    daysOverdue: result.daysOverdue,
    bookTitle: book?.name || null,
    memberName: member?.name || null,
    memberCode: member?.memberCode || null,
    dueDate: result.borrowing.dueDate,
    returnedDate: result.borrowing.returnedDate
  });
});

// Preview return (read-only) - shows overdue info before confirming
exports.previewReturn = catchAsync(async (req, res, next) => {
  const { barcode } = req.params;
  const adminId = req.tenantFilter?.adminId;

  const copy = await BookCopy.findOne({ barcode, status: 'borrowed', adminId });
  if (!copy) throw new ApiError(404, 'This copy is not currently borrowed in your branch');

  const borrowing = await BorrowingHistory.findOne({ bookCopyId: copy._id, requestStatus: 'Active', returnedDate: null, adminId });
  if (!borrowing) throw new ApiError(404, 'Active borrowing not found');

  const now = new Date();
  const fineAmount = calculateOverdueFine(borrowing.dueDate, now);
  const daysOverdue = fineAmount > 0 && borrowing.dueDate
    ? Math.ceil((now - new Date(borrowing.dueDate)) / (1000 * 60 * 60 * 24))
    : 0;

  const [book, member] = await Promise.all([
    Book.findOne({ _id: copy.bookId, adminId }).select('name').lean(),
    Member.findOne({ _id: borrowing.memberId, adminId }).select('name memberCode').lean()
  ]);

  // Count member's other pending fines
  const Fine = require('../models/Fine');
  const pendingFines = await Fine.aggregate([
    { $match: { adminId, borrowedUser: borrowing.memberId, status: 'pending', _id: { $exists: true } } },
    { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amountToPay' } } }
  ]).crossTenant('preview-fines-check');

  const otherFines = pendingFines[0] || { count: 0, total: 0 };

  res.json({
    bookTitle: book?.name || null,
    memberName: member?.name || null,
    memberCode: member?.memberCode || null,
    dueDate: borrowing.dueDate,
    fineAmount,
    daysOverdue,
    otherPendingFinesCount: otherFines.count,
    otherPendingFinesTotal: otherFines.total,
    estimatedAsOf: now
  });
});
