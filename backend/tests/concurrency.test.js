const request = require('supertest');
const app = require('../src/app');
const { createBranch } = require('./factory');
const { BorrowingHistory, BookCopy, Book } = require('../src/models');

describe('Concurrency', () => {
  let branch;

  beforeAll(async () => {
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
    // One should succeed (201 or 200), one should fail (400 or 500 write-conflict)
    expect(statuses[0]).toBeLessThan(300);
    expect(statuses[1]).toBeGreaterThanOrEqual(400);

    const borrowings = await BorrowingHistory.find({ bookCopyId: branch.bookCopy._id }).crossTenant('test assertion');
    expect(borrowings.length).toBe(1);

    const updatedBook = await Book.findById(branch.book._id).crossTenant('test assertion');
    expect(updatedBook.availableCopies).toBe(0);

    const updatedCopy = await BookCopy.findById(branch.bookCopy._id).crossTenant('test assertion');
    expect(updatedCopy.status).toBe('borrowed');
  });
});
