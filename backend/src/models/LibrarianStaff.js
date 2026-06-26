const mongoose = require('mongoose');

const LibrarianStaffSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  staffId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  departmentName: { type: String, required: true },
  emailId: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('LibrarianStaff', LibrarianStaffSchema);
