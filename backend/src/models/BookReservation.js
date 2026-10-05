const mongoose = require('mongoose');
const { tenantGuardPlugin, patchAggregateForModel } = require('../plugins/tenantGuard');

const BookReservationSchema = new mongoose.Schema({
  requestedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  requestedDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'fulfilled'], default: 'pending' },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

BookReservationSchema.plugin(tenantGuardPlugin);

const BookReservation = mongoose.model('BookReservation', BookReservationSchema);
patchAggregateForModel(BookReservation);
module.exports = BookReservation;
