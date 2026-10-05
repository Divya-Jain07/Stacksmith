const request = require('supertest');
const app = require('../src/app');
const { createBranch } = require('./factory');
const { BorrowingHistory, BookCopy } = require('../src/models');

describe('Tenant Isolation (Phase 1 regressions)', () => {
  let branchA, branchB;

  beforeEach(async () => {
    branchA = await createBranch();
    branchB = await createBranch();
  });

  it('A librarian from branch A cannot read branch B book (expect 404)', async () => {
    const res = await request(app)
      .get(`/api/books/${branchB.book._id}`)
      .set('Authorization', `Bearer ${branchA.librarianToken}`);
    expect(res.status).toBe(404);
  });

  it('A librarian from branch A cannot issue branch B copy', async () => {
    const res = await request(app)
      .post(`/api/borrow/issue`)
      .set('Authorization', `Bearer ${branchA.librarianToken}`)
      .send({
        barcode: branchB.bookCopy.barcode,
        memberCode: branchA.memberProfile.memberCode,
        dueDate: new Date(Date.now() + 86400000).toISOString()
      });
    expect(res.status).toBe(400);
  });

  it('A librarian from branch A cannot confirm a branch B Requested borrowing', async () => {
    // Create a requested borrowing in branch B manually (since testing API directly might involve too many requests)
    const borrowing = await BorrowingHistory.create({
      bookCopyId: branchB.bookCopy._id,
      memberId: branchB.memberProfile._id,
      requestStatus: 'Requested',
      borrowedDate: new Date(),
      adminId: branchB.adminId
    });
    
    // Simulate branch B copy being reserved (use updateOne to respect tenant guard)
    await BookCopy.updateOne({ _id: branchB.bookCopy._id, adminId: branchB.adminId }, { $set: { status: 'reserved' } });

    const res = await request(app)
      .patch(`/api/borrow/${borrowing._id}/confirm-issue`)
      .set('Authorization', `Bearer ${branchA.librarianToken}`)
      .send({ dueDate: new Date(Date.now() + 86400000).toISOString() });

    expect(res.status).toBe(404);

    // Verify it is unchanged
    const b = await BorrowingHistory.findById(borrowing._id).crossTenant('test assertion');
    expect(b.requestStatus).toBe('Requested');
  });

  it('The old debug route returns 404 for a member', async () => {
    const res = await request(app)
      .get(`/api/borrow/debug/${branchA.bookCopy.barcode}`)
      .set('Authorization', `Bearer ${branchA.memberToken}`);
    expect(res.status).toBe(404);
  });

  it('updateBook cannot change the available copies count, while an allowed field is updated', async () => {
    const res = await request(app)
      .put(`/api/books/${branchA.book._id}`)
      .set('Authorization', `Bearer ${branchA.librarianToken}`)
      .send({
        name: 'Updated Test Book',
        availableCopies: 999
      });
    
    expect(res.status).toBe(200);
    
    // Refresh branchA book to check state
    const { Book } = require('../src/models');
    const updatedBook = await Book.findById(branchA.book._id).crossTenant('test assertion');
    
    expect(updatedBook.name).toBe('Updated Test Book');
    expect(updatedBook.availableCopies).not.toBe(999);
  });
});
