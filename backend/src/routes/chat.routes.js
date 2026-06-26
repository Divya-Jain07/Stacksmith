const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { authorize } = require('../middlewares/auth.middleware');

// GET  /api/chat/conversations/unassigned  - Librarian queue (must be before /:id)
router.get('/conversations/unassigned', authorize('Admin', 'Librarian', 'SuperAdmin'), chatController.getUnassignedConversations);

// GET  /api/chat/conversations             - My conversations
// POST /api/chat/conversations             - Create a conversation
router.route('/conversations')
  .get(chatController.getConversations)
  .post(authorize('Member'), chatController.createConversation);

// GET  /api/chat/conversations/:id/messages - Message history
// POST /api/chat/conversations/:id/messages - Send message
router.route('/conversations/:id/messages')
  .get(chatController.getConversationMessages)
  .post(chatController.sendMessage);

// PATCH /api/chat/conversations/:id/close  - Close a conversation
router.patch('/conversations/:id/close', authorize('Admin', 'Librarian', 'SuperAdmin'), chatController.closeConversation);

module.exports = router;
