const User = require('../models/User');
const Book = require('../models/Book');
const Member = require('../models/Member');
const Fine = require('../models/Fine');
const BorrowingHistory = require('../models/BorrowingHistory');
const LibrarianStaff = require('../models/LibrarianStaff');

// GET /api/admin/librarians — List all librarians in this Admin's branch
exports.getLibrarians = async (req, res, next) => {
  try {
    const adminId = req.user.adminId;
    const librarians = await LibrarianStaff.find({ adminId }).sort({ createdAt: -1 });

    // Exclude any miscreated staff profiles for Admin users
    const userIds = librarians.map((lib) => lib.userId);
    const adminUsers = await User.find({ _id: { $in: userIds }, role: 'Admin' }).select('_id');
    const adminUserIds = new Set(adminUsers.map((user) => user._id.toString()));
    const filteredLibrarians = librarians.filter((lib) => !adminUserIds.has(lib.userId.toString()));

    res.json(filteredLibrarians);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/librarians/:id — Delete a librarian and their login
exports.deleteLibrarian = async (req, res, next) => {
  try {
    const adminId = req.user.adminId;
    const staffProfile = await LibrarianStaff.findOne({ _id: req.params.id, adminId });
    if (!staffProfile) {
      return res.status(404).json({ error: 'Librarian not found.' });
    }

    // Delete the User login record
    await User.findByIdAndDelete(staffProfile.userId);
    // Delete the LibrarianStaff profile
    await LibrarianStaff.findByIdAndDelete(staffProfile._id);

    res.json({ message: 'Librarian deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.getAggregateStats = async (req, res, next) => {
  try {
    // SuperAdmin only endpoint
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
    }

    const admins = await User.find({ role: 'Admin' });
    const stats = [];

    for (const admin of admins) {
      const bookCount = await Book.countDocuments({ adminId: admin._id });
      const memberCount = await Member.countDocuments({ adminId: admin._id });
      const activeBorrows = await BorrowingHistory.countDocuments({ adminId: admin._id, requestStatus: 'Active' });

      const revenue = await Fine.aggregate([
        { $match: { adminId: admin._id, status: 'collected' } },
        { $group: { _id: null, total: { $sum: '$amountToPay' } } }
      ]);

      stats.push({
        adminId: admin._id,
        adminName: admin.name,
        adminEmail: admin.email,
        metrics: {
          books: bookCount,
          members: memberCount,
          activeBorrows,
          revenueCollected: revenue.length > 0 ? revenue[0].total : 0
        }
      });
    }

    res.json({
      totalLibraries: admins.length,
      libraries: stats
    });
  } catch (err) {
    next(err);
  }
};

exports.updateAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
    }

    const { id } = req.params;
    const { name, email, phone, departmentName } = req.body;

    const user = await User.findById(id);
    if (!user || user.role !== 'Admin') {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    // Update User
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    await user.save();

    // Update LibrarianStaff profile
    const staffProfile = await require('../models/LibrarianStaff').findOne({ userId: id });
    if (staffProfile) {
      if (name) staffProfile.name = name;
      if (email) staffProfile.emailId = email;
      if (departmentName) staffProfile.departmentName = departmentName;
      await staffProfile.save();
    }

    res.json({ message: 'Admin updated successfully.', user, staffProfile });
  } catch (err) {
    next(err);
  }
};

exports.deleteAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
    }

    const { id } = req.params;
    const user = await User.findById(id);
    if (!user || user.role !== 'Admin') {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    const LibrarianStaff = require('../models/LibrarianStaff');
    const BookCopy = require('../models/BookCopy');
    const BookReservation = require('../models/BookReservation');
    const Conversation = require('../models/Conversation');
    const Message = require('../models/Message');
    const BorrowingHistory = require('../models/BorrowingHistory');
    const Fine = require('../models/Fine');

    // Remove all tenant data tied to this admin branch
    await Promise.all([
      BookCopy.deleteMany({ adminId: id }),
      BookReservation.deleteMany({ adminId: id }),
      BorrowingHistory.deleteMany({ adminId: id }),
      Fine.deleteMany({ adminId: id }),
      Book.deleteMany({ adminId: id }),
      Member.deleteMany({ adminId: id }),
      LibrarianStaff.deleteMany({ adminId: id }),
      User.deleteMany({ adminId: id, role: { $in: ['Librarian', 'Member'] } })
    ]);

    const conversations = await Conversation.find({ adminId: id }).select('_id');
    const conversationIds = conversations.map((conversation) => conversation._id);
    if (conversationIds.length > 0) {
      await Message.deleteMany({ conversationId: { $in: conversationIds } });
    }
    await Conversation.deleteMany({ adminId: id });

    // Delete the Admin's User record
    await User.findByIdAndDelete(id);

    res.json({ message: 'Admin and all related tenant data deleted successfully.' });
  } catch (err) {
    next(err);
  }
};