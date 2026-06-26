const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Member = require('../models/Member');
const LibrarianStaff = require('../models/LibrarianStaff');

// GET /api/chat/conversations
// Returns conversations for the logged-in user (member sees theirs, librarian sees assigned ones)
exports.getConversations = catchAsync(async (req, res, next) => {
    let filter = { adminId: req.user.adminId };

    if (req.user.role === 'Member') {
      const member = await Member.findOne({ userId: req.user.id });
      if (!member) throw new ApiError(404, 'Member not found');
      filter.memberId = member._id;
    } else {
      // Librarian/Admin: see conversations assigned to them
      const staff = await LibrarianStaff.findOne({ userId: req.user.id });
      if (staff) filter.librarianId = staff._id;
    }

    const conversations = await Conversation.find(filter)
      .populate('memberId', 'name memberCode')
      .populate('bookId', 'name isbn')
      .sort({ lastMessageAt: -1 });

    res.json(conversations);
  });

// GET /api/chat/conversations/unassigned
// Librarian/Admin only: see all Open (unclaimed) conversations in their branch
exports.getUnassignedConversations = catchAsync(async (req, res, next) => {
    if (req.user.role === 'Member') {
      throw new ApiError(403, 'Forbidden');
    }

    const conversations = await Conversation.find({
      adminId: req.user.adminId,
      status: 'Open'
    })
      .populate('memberId', 'name memberCode')
      .populate('bookId', 'name isbn')
      .sort({ lastMessageAt: -1 });

    res.json(conversations);
  });

// POST /api/chat/conversations
// Create a new conversation (Members only)
exports.createConversation = catchAsync(async (req, res, next) => {
    if (req.user.role !== 'Member') {
      throw new ApiError(403, 'Only members can start conversations');
    }

    const member = await Member.findOne({ userId: req.user.id });
    if (!member) throw new ApiError(404, 'Member not found');

    const conversation = new Conversation({
      memberId: member._id,
      adminId: req.user.adminId,
      status: 'Open'
    });

    await conversation.save();
    res.status(201).json(conversation);
});

// GET /api/chat/conversations/:id/messages
// Get full message history for a conversation
exports.getConversationMessages = catchAsync(async (req, res, next) => {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      adminId: req.user.adminId
    });
    if (!conversation) throw new ApiError(404, 'Conversation not found');

    // Permission check
    if (req.user.role === 'Member') {
      const member = await Member.findOne({ userId: req.user.id });
      if (!member || String(conversation.memberId) !== String(member._id)) {
        throw new ApiError(403, 'Access denied');
      }
    } else {
      const staff = await LibrarianStaff.findOne({ userId: req.user.id });
      if (staff && conversation.librarianId && String(conversation.librarianId) !== String(staff._id)) {
        throw new ApiError(403, 'Access denied');
      }
    }

    const messages = await Message.find({ conversationId: req.params.id }).sort({ createdAt: 1 });

    // Mark messages from the other side as read
    const oppositeRole = req.user.role === 'Member' ? 'Librarian' : 'Member';
    await Message.updateMany(
      { conversationId: req.params.id, senderRole: oppositeRole, readAt: null },
      { readAt: new Date() }
    );

    res.json(messages);
  });

// POST /api/chat/conversations/:id/messages
// Send a new message in a conversation
exports.sendMessage = catchAsync(async (req, res, next) => {
    const conversationId = req.params.id;
    const { message } = req.body;
    
    if (!message) throw new ApiError(400, 'Message content is required');

    const conversation = await Conversation.findOne({
      _id: conversationId,
      adminId: req.user.adminId
    });
    if (!conversation) throw new ApiError(404, 'Conversation not found');

    const senderRole = req.user.role === 'Member' ? 'Member' : 'Librarian';

    const newMessage = new Message({
      conversationId,
      senderId: req.user.id,
      senderRole,
      message,
      adminId: req.user.adminId
    });

    await newMessage.save();

    // Update conversation lastMessageAt
    conversation.lastMessageAt = new Date();
    if (conversation.status === 'Closed') {
      conversation.status = 'Open';
    }
    await conversation.save();

    res.status(201).json(newMessage);
});

// PATCH /api/chat/conversations/:id/close
// Librarian closes a conversation; member can reopen with a new message via socket
exports.closeConversation = catchAsync(async (req, res, next) => {
    if (req.user.role === 'Member') {
      throw new ApiError(403, 'Forbidden');
    }

    const staff = await LibrarianStaff.findOne({ userId: req.user.id });
    const conversation = await Conversation.findOneAndUpdate(
      { 
        _id: req.params.id, 
        $or: [
          { librarianId: staff._id },
          { librarianId: null }
        ],
        adminId: req.user.adminId 
      },
      { 
        status: 'Closed',
        librarianId: staff._id // Assign it to them if they close it
      },
      { new: true }
    );

    if (!conversation) throw new ApiError(404, 'Conversation not found');
    res.json({ message: 'Conversation closed.', conversation });
  });
