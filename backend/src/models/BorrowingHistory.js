const mongoose = require('mongoose');

const BorrowingHistorySchema = new mongoose.Schema({
  requestStatus: { type: String, enum: ['Requested', 'Active', 'Returned'], default: 'Requested' },
  bookCopyId: { type: mongoose.Schema.Types.ObjectId, ref: 'BookCopy', required: true },
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true }, // User borrowed
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'LibrarianStaff' }, // Confirmed by
  borrowedDate: { type: Date }, // Set when Active
  dueDate: { type: Date }, // Set when Active
  returnedDate: { type: Date }, // Null if still checked out
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('BorrowingHistory', BorrowingHistorySchema);
