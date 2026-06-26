const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const BorrowingHistory = require('../models/BorrowingHistory');
const BookCopy = require('../models/BookCopy');
const Member = require('../models/Member');
const LibrarianStaff = require('../models/LibrarianStaff');
const { calculateOverdueFine } = require('../utils/fineCalculator');

// Issue a book copy to a member
exports.issueBook = catchAsync(async (req, res, next) => {
  const { barcode, memberCode, dueDate } = req.body;

  // Strictly enforce tenant scope since barcodes might overlap across different libraries using old formats
  const copyFilter = { barcode, status: { $in: ['available', 'reserved'] }, ...(req.tenantFilter || {}) };
  const copy = await BookCopy.findOne(copyFilter);
  if (!copy) {
    return res.status(400).json({
      error: 'Book copy not available or not found.',
      debug: { receivedBarcode: barcode, filterUsed: copyFilter, reqBody: req.body }
    });
  }

  // Find member (still enforce tenant scope if applicable)
  const memberFilter = { memberCode, status: 'active', ...(req.tenantFilter || {}) };
  const member = await Member.findOne(memberFilter);
  if (!member) throw new ApiError(404, 'Member not found in your library scope');

  const activeBorrows = await BorrowingHistory.countDocuments({
    memberId: member._id,
    returnedDate: null,
    ...(req.tenantFilter || {})
  });
  if (activeBorrows >= member.borrowLimits) {
    throw new ApiError(400, 'Borrow limit exceeded');
  }

  // Determine who is issuing the book
  let staffId = null;
  if (req.user.role === 'Librarian') {
    const staff = await LibrarianStaff.findOne({ userId: req.user.id });
    if (!staff) throw new ApiError(404, 'Librarian staff profile not found');
    staffId = staff._id;
  }

  // If copy was reserved, clean up any pending request for this copy
  if (copy.status === 'reserved') {
    await BorrowingHistory.deleteMany({ bookCopyId: copy._id, requestStatus: 'Requested' });
  }

  const wasPreviouslyReserved = copy.status === 'reserved';

  const borrowing = new BorrowingHistory({
    bookCopyId: copy._id,
    memberId: member._id,
    issuedBy: staffId, // will be null if Admin or SuperAdmin issued it
    dueDate: new Date(dueDate),
    borrowedDate: new Date(),
    requestStatus: 'Active',
    adminId: member.adminId // Assign to the member's library scope
  });
  await borrowing.save();

  copy.status = 'borrowed';
  await copy.save();

  const Book = require('../models/Book');
  const book = await Book.findById(copy.bookId);
  if (book) {
    // Only decrement if the copy was available (reserved copies already decremented availableCopies)
    if (!wasPreviouslyReserved) {
      book.availableCopies = Math.max(0, book.availableCopies - 1);
      await book.save();
    }
  }

  res.status(201).json({ message: 'Book issued successfully.', borrowing });
});

// Return a book copy
exports.returnBook = catchAsync(async (req, res, next) => {
  const { barcode } = req.body;

  const copyFilter = { barcode, status: 'borrowed', ...(req.tenantFilter || {}) };
  const copy = await BookCopy.findOne(copyFilter);
  if (!copy) throw new ApiError(404, 'Book copy not found');

  const borrowFilter = { bookCopyId: copy._id, returnedDate: null, ...(req.tenantFilter || {}) };
  const borrowing = await BorrowingHistory.findOne(borrowFilter);
  if (!borrowing) throw new ApiError(404, 'Borrowing record not found');

  borrowing.returnedDate = new Date();
  borrowing.requestStatus = 'Returned';
  await borrowing.save();

  copy.status = 'available';
  await copy.save();

  const Book = require('../models/Book');
  const book = await Book.findById(copy.bookId);
  if (book) {
    book.availableCopies += 1;
    await book.save();
  }

  const fineAmount = calculateOverdueFine(borrowing.dueDate, borrowing.returnedDate);
  if (fineAmount > 0) {
    const Fine = require('../models/Fine');
    const fineRecord = new Fine({
      borrowingId: borrowing._id,
      borrowedUser: borrowing.memberId,
      amountToPay: fineAmount,
      reason: 'overdue',
      adminId: req.body.adminId || req.user.adminId
    });
    await fineRecord.save();
  }

  res.json({
    message: 'Book returned successfully.',
    fineGenerated: fineAmount > 0 ? fineAmount : 0
  });
});

// Create a reservation for a book
exports.createReservation = catchAsync(async (req, res, next) => {
  const { memberCode, bookId } = req.body;

  const memberFilter = { memberCode, status: 'active', ...(req.tenantFilter || {}) };
  const member = await Member.findOne(memberFilter);
  if (!member) throw new ApiError(404, 'Member not found');

  const BookReservation = require('../models/BookReservation');
  const reservation = new BookReservation({
    requestedUserId: member._id,
    bookId,
    adminId: req.body.adminId || req.user.adminId
  });

  await reservation.save();
  res.status(201).json({ message: 'Reservation created successfully.', reservation });
});

// Renew a borrowed book
exports.renewBorrowing = catchAsync(async (req, res, next) => {
  // Check for either newDueDate or dueDate to be forgiving of API request mistakes
  const { barcode, newDueDate, dueDate } = req.body;
  const targetDate = newDueDate || dueDate;

  if (!targetDate) {
    throw new ApiError(400, 'Due date required');
  }

  const copyFilter = { barcode, status: 'borrowed', ...(req.tenantFilter || {}) };
  const copy = await BookCopy.findOne(copyFilter);
  if (!copy) throw new ApiError(404, 'Borrowed copy not found');

  const borrowFilter = { bookCopyId: copy._id, returnedDate: null, ...(req.tenantFilter || {}) };
  const borrowing = await BorrowingHistory.findOne(borrowFilter);
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
  if (!memberId) throw new ApiError(401, 'Member not authenticated');

  const member = await Member.findById(memberId);

  // Check limits
  const activeBorrows = await BorrowingHistory.countDocuments({
    memberId,
    requestStatus: { $in: ['Requested', 'Active'] }
  });
  if (activeBorrows >= member.borrowLimits) {
    throw new ApiError(400, 'Borrow limit exceeded');
  }

  let copy;
  if (barcode) {
    // Staff-style request with specific barcode
    copy = await BookCopy.findOne({ barcode, status: 'available', ...(req.tenantFilter || {}) });
  } else if (bookId) {
    // Member self-service: auto-assign the first available copy of this book
    copy = await BookCopy.findOne({ bookId, status: 'available', ...(req.tenantFilter || {}) });
  }

  if (!copy) throw new ApiError(404, 'No available copy found for this book');

  // Mark copy as reserved immediately
  copy.status = 'reserved';
  await copy.save();

  // Create BorrowingHistory as Requested
  const borrowing = new BorrowingHistory({
    bookCopyId: copy._id,
    memberId: member._id,
    requestStatus: 'Requested',
    adminId: member.adminId
  });
  await borrowing.save();

  // Update Book catalog available copies
  const Book = require('../models/Book');
  const book = await Book.findById(copy.bookId);
  if (book) {
    book.availableCopies = Math.max(0, book.availableCopies - 1);
    await book.save();
  }

  res.status(201).json({ message: 'Book requested successfully.', borrowing });
});

// Member cancels request
exports.cancelMemberRequest = catchAsync(async (req, res, next) => {
  const memberId = req.memberProfileId;
  const borrowing = await BorrowingHistory.findOne({ _id: req.params.id, memberId, requestStatus: 'Requested' });
  if (!borrowing) throw new ApiError(404, 'Borrowing request not found');

  // Revert copy status
  const copy = await BookCopy.findById(borrowing.bookCopyId);
  if (copy) {
    copy.status = 'available';
    await copy.save();

    // Update Book catalog available copies
    const Book = require('../models/Book');
    const book = await Book.findById(copy.bookId);
    if (book) {
      book.availableCopies += 1;
      await book.save();
    }
  }

  await BorrowingHistory.findByIdAndDelete(borrowing._id);
  res.json({ message: 'Request cancelled successfully.' });
});

// Member reserves a book (catalog hold)
exports.memberReserveBook = catchAsync(async (req, res, next) => {
  const { bookId } = req.body;
  const memberId = req.memberProfileId;
  if (!memberId) throw new ApiError(401, 'Member not authenticated');

  const member = await Member.findById(memberId);

  const BookReservation = require('../models/BookReservation');
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
  const BookReservation = require('../models/BookReservation');
  const reservation = await BookReservation.findOneAndDelete({ _id: req.params.id, requestedUserId: memberId });
  if (!reservation) throw new ApiError(404, 'Reservation not found');
  res.json({ message: 'Reservation cancelled successfully.' });
});

// --- Librarian Confirmation Endpoints ---

// Get pending borrowing requests
exports.getPendingRequests = catchAsync(async (req, res, next) => {
  const pendingBorrows = await BorrowingHistory.find({ requestStatus: 'Requested', ...(req.tenantFilter || {}) })
    .populate('memberId', 'name memberCode')
    .populate({
      path: 'bookCopyId',
      populate: { path: 'bookId', select: 'name author' }
    });
  res.json(pendingBorrows);
});

// Confirm a requested issue
exports.confirmIssue = catchAsync(async (req, res, next) => {
  const { dueDate } = req.body;
  const borrowing = await BorrowingHistory.findOne({ _id: req.params.id, requestStatus: 'Requested' });
  if (!borrowing) throw new ApiError(404, 'Borrowing request not found');

  let staffId = null;
  if (req.user.role === 'Librarian') {
    const staff = await LibrarianStaff.findOne({ userId: req.user.id });
    if (!staff) throw new ApiError(404, 'Librarian staff profile not found');
    staffId = staff._id;
  }

  borrowing.requestStatus = 'Active';
  borrowing.borrowedDate = new Date();
  borrowing.dueDate = new Date(dueDate);
  borrowing.issuedBy = staffId;
  await borrowing.save();

  const copy = await BookCopy.findById(borrowing.bookCopyId);
  if (copy) {
    copy.status = 'borrowed';
    await copy.save();
  }

  res.json({ message: 'Book issue confirmed.', borrowing });
});

// Confirm a return (scanned by librarian)
exports.confirmReturn = catchAsync(async (req, res, next) => {
  const borrowing = await BorrowingHistory.findOne({ _id: req.params.id, requestStatus: 'Active' });
  if (!borrowing) throw new ApiError(404, 'Borrowing not found');

  borrowing.requestStatus = 'Returned';
  borrowing.returnedDate = new Date();
  await borrowing.save();

  const copy = await BookCopy.findById(borrowing.bookCopyId);
  if (copy) {
    copy.status = 'available';
    await copy.save();

    const Book = require('../models/Book');
    const book = await Book.findById(copy.bookId);
    if (book) {
      book.availableCopies += 1;
      await book.save();
    }
  }

  const fineAmount = calculateOverdueFine(borrowing.dueDate, borrowing.returnedDate);
  if (fineAmount > 0) {
    const Fine = require('../models/Fine');
    const fineRecord = new Fine({
      borrowingId: borrowing._id,
      borrowedUser: borrowing.memberId,
      amountToPay: fineAmount,
      reason: 'overdue',
      adminId: borrowing.adminId
    });
    await fineRecord.save();
  }

  res.json({ message: 'Book return confirmed.', fineGenerated: fineAmount > 0 ? fineAmount : 0 });
});
