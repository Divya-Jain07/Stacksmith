const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LibrarianStaff = require('../models/LibrarianStaff');
const Member = require('../models/Member');

// Helper: Generate JWT Token
const generateToken = (user, profileId = null) => {
  const payload = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    adminId: user.adminId,
    profileId
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// ─── Internal helper: creates User + LibrarianStaff profile ─────────────────
const createStaffUser = async ({ name, email, phone, password, role, adminId, staffId, departmentName }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) throw Object.assign(new Error('User with this email already exists.'), { statusCode: 400 });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = new User({ name, email, phone, password: hashedPassword, role, adminId });
  await user.save();

  let uniqueStaffId = staffId;
  if (!uniqueStaffId) {
    let isUnique = false;
    while (!isUnique) {
      uniqueStaffId = `LIB-${Math.floor(1000 + Math.random() * 9000)}`;
      const exists = await LibrarianStaff.findOne({ staffId: uniqueStaffId });
      if (!exists) isUnique = true;
    }
  }

  const staffProfile = new LibrarianStaff({
    userId: user._id,
    adminId: user.adminId,
    staffId: uniqueStaffId,
    name: user.name,
    departmentName: departmentName || 'Library Operations',
    emailId: user.email
  });
  await staffProfile.save();

  return { user, staffProfile };
};

// ─── POST /api/auth/register — Bootstrap SuperAdmin only ────────────────────
// This endpoint only works if NO SuperAdmin exists yet in the database.
// After the first SuperAdmin is created, this route rejects all further calls.
exports.registerSuperAdmin = async (req, res, next) => {
  try {
    const existingSuperAdmin = await User.findOne({ role: 'SuperAdmin' });
    if (existingSuperAdmin) {
      return res.status(403).json({ error: 'System already has a SuperAdmin. Use /create-admin for new branches.' });
    }

    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'name, email, phone and password are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User with this email already exists.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({ name, email, phone, password: hashedPassword, role: 'SuperAdmin', adminId: null });
    await user.save();

    const token = generateToken(user, null);
    res.status(201).json({
      message: 'SuperAdmin registered successfully.',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/create-admin — SuperAdmin creates a branch Admin ─────────
exports.createAdmin = async (req, res, next) => {
  try {
    const { name, email, phone, departmentName, staffId } = req.body;
    const password = req.body.password || 'password123';
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'name, email and phone are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User with this email already exists.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Admin is their own tenant root — adminId = their own _id
    const user = new User({ name, email, phone, password: hashedPassword, role: 'Admin' });
    user.adminId = user._id;
    await user.save();

    const token = generateToken(user, null);
    res.status(201).json({
      message: 'Branch Admin registered successfully.',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, adminId: user.adminId }
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/create-librarian — Admin creates a Librarian ─────────────
exports.createLibrarian = async (req, res, next) => {
  try {
    const { name, email, phone, departmentName, staffId } = req.body;
    const password = req.body.password || 'password123';
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'name, email and phone are required.' });
    }

    const adminId = req.user.adminId; // Inherited from the logged-in Admin/Librarian

    try {
      const { user, staffProfile } = await createStaffUser({
        name, email, phone, password,
        role: 'Librarian',
        adminId,
        staffId,
        departmentName
      });

      const token = generateToken(user, staffProfile._id);
      res.status(201).json({
        message: 'Librarian registered successfully.',
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, adminId: user.adminId },
        staffProfile
      });
    } catch (innerErr) {
      return res.status(innerErr.statusCode || 400).json({ error: innerErr.message });
    }
  } catch (err) {
    next(err);
  }
};

// Staff Login
exports.staffLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || user.role === 'Member') {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const staff = await LibrarianStaff.findOne({ userId: user._id });
    const profileId = staff ? staff._id : null;
    const token = generateToken(user, profileId);

 
    res.json({
      message: 'Staff login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        adminId: user.adminId,
        staffId: staff ? staff.staffId : null,
        staffProfileId: staff ? staff._id : null
      }
    });
  } catch (err) {
    next(err);
  }
};

// Member Login
exports.memberLogin = async (req, res, next) => {
  try {
    const { memberCode, password } = req.body;

    const member = await Member.findOne({ memberCode }).populate('userId');
    if (!member || !member.userId) {
      return res.status(401).json({ error: 'Invalid member code or password.' });
    }

    const user = member.userId;
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid member code or password.' });
    }

    if (user.role !== 'Member') {
      return res.status(401).json({ error: 'Invalid member code or password.' });
    }

    const token = generateToken(user, member._id);

    res.json({
      message: 'Member login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        adminId: user.adminId,
        memberCode: member.memberCode,
        memberProfileId: member._id
      }
    });
  } catch (err) {
    next(err);
  }
};

// Change Password (Any logged in user)
exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Please provide both old and new passwords.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect old password.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
};
