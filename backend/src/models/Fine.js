const mongoose = require('mongoose');
const { tenantGuardPlugin, patchAggregateForModel } = require('../plugins/tenantGuard');

const FineSchema = new mongoose.Schema({
  borrowingId: { type: mongoose.Schema.Types.ObjectId, ref: 'BorrowingHistory', required: true },
  borrowedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  amountToPay: { type: Number, required: true },
  reason: { type: String, enum: ['lost', 'overdue', 'damaged'], required: true },
  status: { type: String, enum: ['pending', 'collected', 'left'], default: 'pending' },
  paymentMode: { type: String, enum: ['Cash', 'UPI', 'Card', 'None'], default: 'None' },
  collectedAt: { type: Date },
  paymentCollectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'LibrarianStaff' },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

FineSchema.plugin(tenantGuardPlugin);

const Fine = mongoose.model('Fine', FineSchema);
patchAggregateForModel(Fine);
module.exports = Fine;
