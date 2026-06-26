const mongoose = require('mongoose');

const BookReservationSchema = new mongoose.Schema({
  requestedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  requestedDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'fulfilled'], default: 'pending' },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('BookReservation', BookReservationSchema);
