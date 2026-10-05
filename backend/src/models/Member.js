const mongoose = require('mongoose');
const { tenantGuardPlugin, patchAggregateForModel } = require('../plugins/tenantGuard');

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

MemberSchema.plugin(tenantGuardPlugin);

const Member = mongoose.model('Member', MemberSchema);
patchAggregateForModel(Member);
module.exports = Member;
