const mongoose = require('mongoose');
const { tenantGuardPlugin, patchAggregateForModel } = require('../plugins/tenantGuard');

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

BorrowingHistorySchema.plugin(tenantGuardPlugin);

const BorrowingHistory = mongoose.model('BorrowingHistory', BorrowingHistorySchema);
patchAggregateForModel(BorrowingHistory);
module.exports = BorrowingHistory;
