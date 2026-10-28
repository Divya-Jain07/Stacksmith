const request = require('supertest');
const app = require('../src/app');
const { createBranch } = require('./factory');
const { BorrowingHistory, BookCopy, Book } = require('../src/models');

describe('Concurrency', () => {
  let branch;

  beforeEach(async () => {
    branch = await createBranch();
    // Start with 1 available copy
    branch.book.availableCopies = 1;
    await branch.book.save();
  });

  it('Two simultaneous issue requests for the same copy: exactly one succeeds', async () => {
    const payload = {
      barcode: branch.bookCopy.barcode,
      memberCode: branch.memberProfile.memberCode,
      dueDate: new Date(Date.now() + 86400000).toISOString()
    };

    const req1 = request(app)
      .post(`/api/borrow/issue`)
      .set('Authorization', `Bearer ${branch.librarianToken}`)
      .send(payload);

    const req2 = request(app)
      .post(`/api/borrow/issue`)
      .set('Authorization', `Bearer ${branch.librarianToken}`)
      .send(payload);

    const [res1, res2] = await Promise.all([req1, req2]);

    const statuses = [res1.status, res2.status].sort();
    // One should succeed (201 or 200), one should fail with exactly 4xx (400 or 409), never a 5xx
    expect(statuses[0]).toBeLessThan(300);
    expect([400, 409]).toContain(statuses[1]);

    const borrowings = await BorrowingHistory.find({ bookCopyId: branch.bookCopy._id }).crossTenant('test assertion');
    expect(borrowings.length).toBe(1);

    const updatedBook = await Book.findById(branch.book._id).crossTenant('test assertion');
    expect(updatedBook.availableCopies).toBe(0);

    const updatedCopy = await BookCopy.findById(branch.bookCopy._id).crossTenant('test assertion');
    expect(updatedCopy.status).toBe('borrowed');
  });

  it('Two simultaneous issue requests of different copies to one member whose limit is 1: exactly one succeeds', async () => {
    const { Member } = require('../src/models');
    // Set member borrow limit to 1 using scoped updateOne to satisfy tenant guard
    await Member.updateOne({ _id: branch.memberProfile._id, adminId: branch.adminId }, { $set: { borrowLimits: 1 } });

    // Create 2 separate copies for the test
    const copy1 = await BookCopy.create({
      bookId: branch.book._id,
      bookName: branch.book.name,
      barcode: `BAR_CONC_1_${Date.now()}`,
      status: 'available',
      adminId: branch.adminId
    });

    const copy2 = await BookCopy.create({
      bookId: branch.book._id,
      bookName: branch.book.name,
      barcode: `BAR_CONC_2_${Date.now()}`,
      status: 'available',
      adminId: branch.adminId
    });

    const payload1 = {
      barcode: copy1.barcode,
      memberCode: branch.memberProfile.memberCode,
      dueDate: new Date(Date.now() + 86400000).toISOString()
    };

    const payload2 = {
      barcode: copy2.barcode,
      memberCode: branch.memberProfile.memberCode,
      dueDate: new Date(Date.now() + 86400000).toISOString()
    };

    const req1 = request(app)
      .post(`/api/borrow/issue`)
      .set('Authorization', `Bearer ${branch.librarianToken}`)
      .send(payload1);

    const req2 = request(app)
      .post(`/api/borrow/issue`)
      .set('Authorization', `Bearer ${branch.librarianToken}`)
      .send(payload2);

    const [res1, res2] = await Promise.all([req1, req2]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses[0]).toBe(201);
    expect([400, 409]).toContain(statuses[1]); // Loser must get 400 (limit exceeded) or 409 (retry conflict)

    // Verify member has exactly 1 active borrowing
    const activeBorrows = await BorrowingHistory.countDocuments({
      memberId: branch.memberProfile._id,
      requestStatus: 'Active',
      adminId: branch.adminId
    });
    expect(activeBorrows).toBe(1);
  });
});
