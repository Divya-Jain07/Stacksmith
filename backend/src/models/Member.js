const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  emailId: { type: String, required: true, unique: true },
  memberCode: { type: String, required: true, unique: true }, // Barcode/Card reference
  membershipType: { type: String, required: true }, // e.g. Student, Faculty
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  membershipExpiryDate: { type: Date, required: true },
  borrowLimits: { type: Number, default: 3 }, // Maximum concurrent books allowed
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Member', MemberSchema);
