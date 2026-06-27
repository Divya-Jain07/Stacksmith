const jwt = require('jsonwebtoken');
const Member = require('../models/Member');
const LibrarianStaff = require('../models/LibrarianStaff');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// Simple in-memory rate limiter: max 5 messages per 10 seconds per socket
const rateLimitMap = new Map();

const isRateLimited = (socketId) => {
  const now = Date.now();
  const WINDOW_MS = 10000; // 10 seconds
  const MAX_MESSAGES = 5;

  if (!rateLimitMap.has(socketId)) {
    rateLimitMap.set(socketId, { count: 1, windowStart: now });
    return false;
  }

  const entry = rateLimitMap.get(socketId);
  if (now - entry.windowStart > WINDOW_MS) {
    // Reset window
    rateLimitMap.set(socketId, { count: 1, windowStart: now });
    return false;
  }

  entry.count++;
  if (entry.count > MAX_MESSAGES) return true;
  return false;
};

// Sanitize message text — strip HTML tags and trim
const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  return text.replace(/<[^>]*>/g, '').trim().slice(0, 2000);
};

module.exports = (io) => {
  // ─── JWT Auth Middleware on Connection ───────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      // Allow token from auth payload OR query string for easier testing in tools like Postman
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication error: No token provided.'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { id, role, adminId, profileId }

      // Fetch the profile (Member or LibrarianStaff) to confirm it exists
      if (decoded.role === 'Member') {
        const member = await Member.findOne({ userId: decoded.id });
        if (!member) return next(new Error('Member profile not found.'));
        socket.memberProfile = member;
      } else if (decoded.role === 'Librarian' || decoded.role === 'Admin') {
        const staff = await LibrarianStaff.findOne({ userId: decoded.id });
        if (!staff) return next(new Error('Staff profile not found.'));
        socket.staffProfile = staff;
      } else {
        return next(new Error('Unauthorized role for chat.'));
      }

      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token.'));
    }
  });

  // ─── On Connection ───────────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { role, id: userId, adminId } = socket.user;

    // Each user joins their own private room for direct pushes
    socket.join(`user:${userId}`);

    // All librarians/admins join the shared unassigned queue room
    if (role === 'Librarian' || role === 'Admin') {
      socket.join(`librarians:${adminId}`);
    }

    // ─── Member: Start a New Conversation ─────────────────────────────────────
    socket.on('conversation:new', async ({ bookId, text }, callback) => {
      try {
        if (role !== 'Member') {
          return callback?.({ error: 'Only members can start conversations.' });
        }

        const sanitized = text ? sanitizeText(text) : '';

        const conversation = new Conversation({
          memberId: socket.memberProfile._id,
          bookId: bookId || null,
          adminId
        });
        await conversation.save();
        await conversation.populate('memberId', 'name memberCode');

        let firstMessage = null;
        if (sanitized) {
          firstMessage = new Message({
            conversationId: conversation._id,
            senderId: userId,
            senderRole: 'Member',
            text: sanitized
          });
          await firstMessage.save();
          await Conversation.findByIdAndUpdate(conversation._id, { lastMessageAt: new Date() });
        }

        // Member joins the conversation room
        socket.join(`conv:${conversation._id}`);

        // Notify all online librarians of the new unassigned conversation
        io.to(`librarians:${adminId}`).emit('conversation:created', {
          conversation,
          firstMessage
        });

        callback?.({ conversation, message: firstMessage });
      } catch (err) {
        callback?.({ error: 'Failed to create conversation.' });
      }
    });

    // ─── Librarian: Claim / Assign a Conversation ─────────────────────────────
    socket.on('conversation:assign', async ({ conversationId }, callback) => {
      try {
        if (role !== 'Librarian' && role !== 'Admin') {
          return callback?.({ error: 'Only librarians can claim conversations.' });
        }

        // Use findOneAndUpdate with a condition to ensure only one librarian wins the race
        const conversation = await Conversation.findOneAndUpdate(
          {
            _id: conversationId,
            status: 'Open',         // Must still be open
            librarianId: null,      // Must not already be claimed
            adminId                 // Must belong to this admin scope
          },
          {
            librarianId: socket.staffProfile._id,
            status: 'Assigned'
          },
          { new: true }
        ).populate('memberId', 'name memberCode');

        if (!conversation) {
          return callback?.({ error: 'Conversation already assigned or not found.' });
        }

        // Librarian joins the private conversation room
        socket.join(`conv:${conversationId}`);

        // Push the member into the room too (they may have already joined)
        // Notify everyone in the conv room of the assignment
        io.to(`conv:${conversationId}`).emit('conversation:assigned', { conversation });

        // Notify librarians dashboard to remove it from the unassigned list
        io.to(`librarians:${adminId}`).emit('conversation:assigned', { conversation });

        callback?.({ conversation });
      } catch (err) {
        callback?.({ error: 'Failed to assign conversation.' });
      }
    });

    // ─── Both: Send a Message ─────────────────────────────────────────────────
    socket.on('message:send', async ({ conversationId, text }, callback) => {
      try {
        if (isRateLimited(socket.id)) {
          return callback?.({ error: 'You are sending messages too quickly. Please slow down.' });
        }

        const sanitized = sanitizeText(text);
        if (!sanitized) return callback?.({ error: 'Message text cannot be empty.' });

        // Fetch the conversation and verify permissions server-side
        const conversation = await Conversation.findOne({ _id: conversationId, adminId });
        if (!conversation) return callback?.({ error: 'Conversation not found.' });
        if (conversation.status === 'Closed') return callback?.({ error: 'This conversation is closed.' });

        // Verify ownership — never trust the client
        if (role === 'Member') {
          if (String(conversation.memberId) !== String(socket.memberProfile._id)) {
            return callback?.({ error: 'Access denied to this conversation.' });
          }
        } else {
          // Librarian/Admin must be assigned to reply
          if (String(conversation.librarianId) !== String(socket.staffProfile._id)) {
            return callback?.({ error: 'You are not assigned to this conversation.' });
          }
        }

        const senderRole = role === 'Member' ? 'Member' : 'Librarian';
        const message = new Message({
          conversationId,
          senderId: userId,
          senderRole,
          text: sanitized
        });
        await message.save();

        await Conversation.findByIdAndUpdate(conversationId, { lastMessageAt: new Date() });

        // Broadcast to everyone in the room (both member and librarian)
        io.to(`conv:${conversationId}`).emit('message:new', { message });

        callback?.({ message });
      } catch (err) {
        callback?.({ error: 'Failed to send message.' });
      }
    });

    // ─── Librarian: Join an existing conversation room (on page load / re-entry)
    socket.on('conversation:join', async ({ conversationId }, callback) => {
      try {
        const conversation = await Conversation.findOne({ _id: conversationId, adminId });
        if (!conversation) return callback?.({ error: 'Conversation not found.' });

        if (role === 'Member') {
          if (String(conversation.memberId) !== String(socket.memberProfile._id)) {
            return callback?.({ error: 'Access denied.' });
          }
        } else {
          if (conversation.librarianId && String(conversation.librarianId) !== String(socket.staffProfile._id)) {
            return callback?.({ error: 'You are not assigned to this conversation.' });
          }
        }

        socket.join(`conv:${conversationId}`);

        // Mark unread messages as read
        await Message.updateMany(
          { conversationId, senderRole: role === 'Member' ? 'Librarian' : 'Member', readAt: null },
          { readAt: new Date() }
        );

        callback?.({ joined: true });
      } catch (err) {
        callback?.({ error: 'Failed to join conversation.' });
      }
    });

    // ─── Librarian: Close a Conversation ─────────────────────────────────────
    socket.on('conversation:close', async ({ conversationId }, callback) => {
      try {
        if (role !== 'Librarian' && role !== 'Admin') {
          return callback?.({ error: 'Only librarians can close conversations.' });
        }

        const conversation = await Conversation.findOneAndUpdate(
          {
            _id: conversationId,
            $or: [
              { librarianId: socket.staffProfile._id },
              { librarianId: null }
            ],
            adminId
          },
          { 
            status: 'Closed',
            librarianId: socket.staffProfile._id // Assign it to them if they close it
          },
          { new: true }
        ).populate('memberId', 'name memberCode');

        if (!conversation) {
          return callback?.({ error: 'Conversation not found or you are not assigned.' });
        }

        io.to(`conv:${conversationId}`).emit('conversation:closed', { conversationId });
        callback?.({ conversation });
      } catch (err) {
        callback?.({ error: 'Failed to close conversation.' });
      }
    });

    // ─── Cleanup on disconnect ─────────────────────────────────────────────────
    socket.on('disconnect', () => {
      rateLimitMap.delete(socket.id);
    });
  });
};
