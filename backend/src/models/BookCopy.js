const mongoose = require('mongoose');

const BookCopySchema = new mongoose.Schema({
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  bookName: { type: String, required: true },
  barcode: { type: String, required: true, unique: true }, // Scannable label on the book
  status: { type: String, enum: ['lost', 'damaged', 'reserved', 'borrowed', 'available'], default: 'available' },
  condition: { type: String, enum: ['perfect', 'okay', 'poor'], default: 'perfect' },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('BookCopy', BookCopySchema);
