const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, enum: ['Member', 'Librarian'], required: true },
  text: { type: String, required: true, maxlength: 2000 },
  readAt: { type: Date, default: null } // null until seen by the other party
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
