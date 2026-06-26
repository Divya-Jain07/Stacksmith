const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  librarianId: { type: mongoose.Schema.Types.ObjectId, ref: 'LibrarianStaff', default: null }, // null until claimed
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', default: null }, // optional reference
  status: { type: String, enum: ['Open', 'Assigned', 'Closed'], default: 'Open' },
  lastMessageAt: { type: Date, default: Date.now },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Conversation', ConversationSchema);
