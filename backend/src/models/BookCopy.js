const mongoose = require('mongoose');

const BookCopySchema = new mongoose.Schema({
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  bookName: { type: String, required: true },
  barcode: { type: String, required: true, unique: true }, // Scannable label on the book
  status: { type: String, enum: ['lost', 'damaged', 'reserved', 'borrowed', 'available'], default: 'available' },
  condition: { type: String, enum: ['perfect', 'okay', 'poor'], default: 'perfect' },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Compound index covering the aggregation in getBooks: group by bookId, filter by status
BookCopySchema.index({ bookId: 1, status: 1 });
// Index for tenant-scoped queries (adminId is used in $match of the aggregation)
BookCopySchema.index({ adminId: 1, bookId: 1, status: 1 });

module.exports = mongoose.model('BookCopy', BookCopySchema);
