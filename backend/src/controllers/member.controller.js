const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Member = require('../models/Member');
const User = require('../models/User');
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

    const existingMember = await Member.findOne({ emailId }).crossTenant('global uniqueness check: member email is globally unique');
    if (existingMember) {
      return res.status(400).json({ error: 'Member with this email already exists.' });
    }

    const existingUser = await User.findOne({ email: emailId });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    // Generate a random temp password if none supplied; never fall back to a known default.
    let tempPassword = null;
    const passwordToHash = password || (() => { tempPassword = crypto.randomBytes(8).toString('hex'); return tempPassword; })();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(passwordToHash, salt);

    // Always take the tenant from the verified token — never from the request body.
    const adminId = req.tenantFilter?.adminId || req.user.adminId;

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
        const exists = await Member.findOne({ memberCode: uniqueMemberCode }).crossTenant('global uniqueness check: auto-generated member code must be globally unique');
        if (!exists) {
          isUnique = true;
        }
      }
    } else {
      const exists = await Member.findOne({ memberCode: uniqueMemberCode }).crossTenant('global uniqueness check: custom member code must be globally unique');
      if (exists) {
        return res.status(400).json({ error: 'Member with this member code already exists.' });
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
      ...(tempPassword && { temporaryPassword: tempPassword })
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
      .populate({ path: 'bookCopyId', match: req.tenantFilter || {} })
      .sort({ borrowedDate: -1 });

    // Fetch outstanding fines (pending only — bug fix: was previously returning all fines including paid/waived)
    const outstandingFines = await Fine.find({ borrowedUser: member._id, status: 'pending', ...(req.tenantFilter || {}) });

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
        const book = await Book.findOne({ _id: h.bookCopyId.bookId, adminId: member.adminId });
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
    const isStaff = ['SuperAdmin', 'Admin', 'Librarian'].includes(req.user.role);
    const filter = { _id: req.params.id, ...(req.tenantFilter || {}) };

    const STAFF_ONLY_FIELDS = ['membershipType', 'membershipExpiryDate', 'borrowLimits', 'status'];
    const DISALLOWED_ALWAYS = ['userId', 'adminId', 'memberCode', '_id', 'createdAt', 'updatedAt'];

    let updateData = {};

    if (!isStaff) {
      // Member self-update: check if any staff-only field was submitted
      for (const field of STAFF_ONLY_FIELDS) {
        if (req.body[field] !== undefined) {
          return res.status(403).json({ error: `Members cannot update ${field}.` });
        }
      }
      // Members can only update harmless profile fields: name, phone
      if (req.body.name !== undefined) updateData.name = req.body.name;
    } else {
      // Staff update: allow staff fields + profile fields, but NEVER internal IDs
      const ALLOWED_STAFF_FIELDS = ['name', 'membershipType', 'membershipExpiryDate', 'borrowLimits', 'status', 'emailId'];
      for (const field of ALLOWED_STAFF_FIELDS) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
    }

    // Always strip internal immutable fields if present
    for (const field of DISALLOWED_ALWAYS) {
      delete updateData[field];
    }

    const member = await Member.findOneAndUpdate(
      filter,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!member) return res.status(404).json({ error: 'Member not found or access denied.' });

    // Also sync user profile (e.g. name or phone) if provided
    if (req.body.phone !== undefined || req.body.name !== undefined) {
      const userUpdates = {};
      if (req.body.name !== undefined) userUpdates.name = req.body.name;
      if (req.body.phone !== undefined) userUpdates.phone = req.body.phone;
      await User.updateOne({ _id: member.userId }, { $set: userUpdates });
    }

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
        match: req.tenantFilter || {},
        populate: { path: 'bookId', match: req.tenantFilter || {} }
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
        match: req.tenantFilter || {},
        populate: {
          path: 'bookCopyId',
          match: req.tenantFilter || {},
          populate: { path: 'bookId', match: req.tenantFilter || {} }
        }
      })
      .sort({ createdAt: -1 });

    res.json(fines);
  } catch (err) {
    next(err);
  }
};
