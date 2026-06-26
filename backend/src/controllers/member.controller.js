const Member = require('../models/Member');
const BorrowingHistory = require('../models/BorrowingHistory');
const Fine = require('../models/Fine');
const Book = require('../models/Book');

// Register Library Member (Creates both User login and Member profile)
exports.createMember = async (req, res, next) => {
  try {
    const { name, emailId: rawEmailId, email, memberCode, membershipType, membershipExpiryDate, borrowLimits, password } = req.body;
    const emailId = rawEmailId || email;

    if (!emailId) {
      return res.status(400).json({ error: 'Member email is required.' });
    }

    const existingMember = await Member.findOne({ emailId });
    if (existingMember) {
      return res.status(400).json({ error: 'Member with this email already exists.' });
    }

    const User = require('../models/User');
    const existingUser = await User.findOne({ email: emailId });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'password123', salt);

    const adminId = req.body.adminId || req.user.adminId;

    const user = new User({
      name,
      email: emailId,
      phone: req.body.phone || '0000000000',
      password: hashedPassword,
      role: 'Member',
      adminId
    });
    await user.save();

    let uniqueMemberCode = memberCode;
    if (!uniqueMemberCode) {
      let isUnique = false;
      while (!isUnique) {
        uniqueMemberCode = `MEM-${Math.floor(1000 + Math.random() * 9000)}`;
        const exists = await Member.findOne({ memberCode: uniqueMemberCode });
        if (!exists) {
          isUnique = true;
        }
      }
    }

    const member = new Member({
      userId: user._id,
      name,
      emailId,
      memberCode: uniqueMemberCode,
      membershipType,
      status: 'active',
      membershipExpiryDate: membershipExpiryDate ? new Date(membershipExpiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      borrowLimits: borrowLimits || 3,
      adminId
    });
    await member.save();

    res.status(201).json({
      message: 'Member registered successfully. They can now login using their memberCode.',
      member,
      defaultPassword: password ? undefined : 'password123'
    });
  } catch (err) {
    next(err);
  }
};

// List all Members
exports.getMembers = async (req, res, next) => {
  try {
    const members = await Member.find(req.tenantFilter || {}).sort({ createdAt: -1 });
    res.json(members);
  } catch (err) {
    next(err);
  }
};

// Get Member Profile with History and Reading Stats
exports.getMemberById = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, ...(req.tenantFilter || {}) };
    const member = await Member.findOne(filter).populate({ path: 'userId', select: 'phone email name' });
    if (!member) return res.status(404).json({ error: 'Member not found or access denied.' });

    // Fetch borrow history
    const borrowHistory = await BorrowingHistory.find({ memberId: member._id, ...(req.tenantFilter || {}) })
      .populate('bookCopyId')
      .sort({ borrowedDate: -1 });

    // Fetch outstanding fines
    const outstandingFines = await Fine.find({ borrowedUser: member._id, ...(req.tenantFilter || {}) });

    // Calculate Reading Statistics
    const totalBooksRead = borrowHistory.filter(h => h.returnedDate).length;

    // Average borrow duration (in days)
    let avgBorrowDays = 0;
    const returnedItems = borrowHistory.filter(h => h.returnedDate);
    if (returnedItems.length > 0) {
      const sumDays = returnedItems.reduce((acc, h) => {
        const diff = new Date(h.returnedDate) - new Date(h.borrowedDate);
        return acc + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgBorrowDays = Math.round(sumDays / returnedItems.length);
    }

    // Most read genre
    const genreMap = {};
    for (const h of borrowHistory) {
      if (h.bookCopyId) {
        const book = await Book.findById(h.bookCopyId.bookId);
        if (book) {
          genreMap[book.genre] = (genreMap[book.genre] || 0) + 1;
        }
      }
    }
    let mostReadGenre = 'None';
    let maxGenreCount = 0;
    for (const genre in genreMap) {
      if (genreMap[genre] > maxGenreCount) {
        maxGenreCount = genreMap[genre];
        mostReadGenre = genre;
      }
    }

    res.json({
      member,
      borrowHistory,
      outstandingFines,
      stats: {
        totalBooksRead,
        avgBorrowDays,
        mostReadGenre
      }
    });
  } catch (err) {
    next(err);
  }
};

// Update Member
exports.updateMember = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, ...(req.tenantFilter || {}) };
    const member = await Member.findOneAndUpdate(
      filter,
      req.body,
      { new: true, runValidators: true }
    );
    if (!member) return res.status(404).json({ error: 'Member not found or access denied.' });
    res.json({ message: 'Member updated successfully.', member });
  } catch (err) {
    next(err);
  }
};

// Self-Service: Get My Borrowings
exports.getMyBorrowings = async (req, res, next) => {
  try {
    const memberId = req.memberProfileId;
    if (!memberId) return res.status(403).json({ error: 'Member profile not found.' });

    const filter = { memberId, ...(req.tenantFilter || {}) };
    
    // Allow filtering by status (e.g., ?status=Active or ?status=Requested)
    if (req.query.status) {
      filter.requestStatus = req.query.status;
    }

    const history = await BorrowingHistory.find(filter)
      .populate({
        path: 'bookCopyId',
        populate: { path: 'bookId' }
      })
      .sort({ createdAt: -1 });

    res.json(history);
  } catch (err) {
    next(err);
  }
};

// Self-Service: Get My Fines
exports.getMyFines = async (req, res, next) => {
  try {
    const memberId = req.memberProfileId;
    if (!memberId) return res.status(403).json({ error: 'Member profile not found.' });

    const filter = { borrowedUser: memberId, ...(req.tenantFilter || {}) };
    const fines = await Fine.find(filter)
      .populate({
        path: 'borrowingId',
        populate: {
          path: 'bookCopyId',
          populate: { path: 'bookId' }
        }
      })
      .sort({ createdAt: -1 });

    res.json(fines);
  } catch (err) {
    next(err);
  }
};
