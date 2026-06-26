const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true }, // Hashed
  role: { type: String, enum: ['SuperAdmin', 'Admin', 'Librarian', 'Member'], default: 'Librarian' },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null } // null for SuperAdmin
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
