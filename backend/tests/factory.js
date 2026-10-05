const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const {
  User,
  Book,
  BookCopy,
  Member,
  LibrarianStaff,
} = require('../src/models');

const generateToken = (user, profileId) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      adminId: user.adminId,
      profileId
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

exports.createBranch = async () => {
  const uid = crypto.randomBytes(4).toString('hex');
  // 1. Admin
  const adminUser = await User.create({
    name: `Admin User ${uid}`,
    email: `admin_${uid}@test.com`,
    phone: `123456${uid}`,
    password: 'hashed_password', // Mocked, as tests generally bypass login
    role: 'Admin',
  });
  adminUser.adminId = adminUser._id;
  await adminUser.save();

  const adminId = adminUser._id;

  // 2. Librarian
  const librarianUser = await User.create({
    name: `Librarian User ${uid}`,
    email: `lib_${uid}@test.com`,
    phone: `223456${uid}`,
    password: 'hashed_password',
    role: 'Librarian',
    adminId,
  });

  const librarianStaff = await LibrarianStaff.create({
    userId: librarianUser._id,
    adminId,
    staffId: `STAFF_${uid}`,
    name: librarianUser.name,
    departmentName: 'Circulation',
    emailId: librarianUser.email,
  });

  const librarianToken = generateToken(librarianUser, librarianStaff._id);

  // 3. Member
  const memberUser = await User.create({
    name: `Member User ${uid}`,
    email: `mem_${uid}@test.com`,
    phone: `323456${uid}`,
    password: 'hashed_password',
    role: 'Member',
    adminId,
  });

  const memberProfile = await Member.create({
    userId: memberUser._id,
    adminId,
    name: memberUser.name,
    emailId: memberUser.email,
    memberCode: `MEM_${uid}`,
    membershipType: 'Student',
    membershipExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Next year
  });

  const memberToken = generateToken(memberUser, memberProfile._id);

  // 4. Book
  const book = await Book.create({
    name: `Test Book ${uid}`,
    author: 'Test Author',
    isbn: `ISBN_${uid}`,
    genre: 'Fiction',
    language: 'English',
    publisher: 'Test Publisher',
    yearPublished: 2024,
    adminId,
  });

  // 5. Book Copy
  const bookCopy = await BookCopy.create({
    bookId: book._id,
    bookName: book.name,
    barcode: `BAR_${uid}`,
    status: 'available',
    adminId,
  });

  return {
    adminUser,
    librarianUser,
    librarianStaff,
    librarianToken,
    memberUser,
    memberProfile,
    memberToken,
    book,
    bookCopy,
    adminId,
  };
};
