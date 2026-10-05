const request = require('supertest');
const app = require('../src/app');
const { createBranch } = require('./factory');
const { BorrowingHistory, BookCopy, Book, Fine } = require('../src/models');
const mongoose = require('mongoose');

describe('Circulation behaviour', () => {
  let branch;

  beforeEach(async () => {
    branch = await createBranch();
    // Use atomic update to set availableCopies — avoids triggering Mongoose doc-level guard
    await Book.updateOne({ _id: branch.book._id, adminId: branch.adminId }, { $set: { availableCopies: 1 } });
  });

  it('Request then confirm then return produces the correct copy states, counter values and fine', async () => {
    // 1. Member requests book
    const reqRes = await request(app)
      .post('/api/borrow/request')
      .set('Authorization', `Bearer ${branch.memberToken}`)
      .send({ bookId: branch.book._id });
    
    expect(reqRes.status).toBe(201);
    
    const borrowingId = reqRes.body.borrowing._id;
    let b = await BorrowingHistory.findById(borrowingId).crossTenant('test');
    expect(b.requestStatus).toBe('Requested');

    let updatedBook = await Book.findById(branch.book._id).crossTenant('test');
    expect(updatedBook.availableCopies).toBe(0); // Decremented
    
    let copy = await BookCopy.findOne({ bookId: branch.book._id }).crossTenant('test');
    expect(copy.status).toBe('reserved');

    // 2. Librarian confirms issue — due date must be in the future
    const confirmRes = await request(app)
      .patch(`/api/borrow/${borrowingId}/confirm-issue`)
      .set('Authorization', `Bearer ${branch.librarianToken}`)
      .send({ dueDate: new Date(Date.now() + 86400000).toISOString() }); // Valid: due tomorrow

    expect(confirmRes.status).toBe(200);

    b = await BorrowingHistory.findById(borrowingId).crossTenant('test');
    expect(b.requestStatus).toBe('Active');

    copy = await BookCopy.findById(b.bookCopyId).crossTenant('test');
    expect(copy.status).toBe('borrowed');

    updatedBook = await Book.findById(branch.book._id).crossTenant('test');
    expect(updatedBook.availableCopies).toBe(0);

    // Simulate overdue: backdate the dueDate to 2 days ago directly in the DB
    const pastDue = new Date(Date.now() - 2 * 86400000);
    await BorrowingHistory.updateOne(
      { _id: borrowingId, adminId: branch.adminId },
      { $set: { dueDate: pastDue } }
    );

    // 3. Librarian returns the book
    const returnRes = await request(app)
      .post(`/api/borrow/return`)
      .set('Authorization', `Bearer ${branch.librarianToken}`)
      .send({ barcode: copy.barcode });

    expect(returnRes.status).toBe(200);
    
    b = await BorrowingHistory.findById(borrowingId).crossTenant('test');
    expect(b.requestStatus).toBe('Returned');

    copy = await BookCopy.findById(b.bookCopyId).crossTenant('test');
    expect(copy.status).toBe('available');

    updatedBook = await Book.findById(branch.book._id).crossTenant('test');
    expect(updatedBook.availableCopies).toBe(1);

    // Should have a fine because it was 2 days late
    const fines = await Fine.find({ borrowingId: b._id }).crossTenant('test');
    expect(fines.length).toBe(1);
    expect(fines[0].amountToPay).toBeGreaterThan(0);
  });

  it('Cancelling a request restores the copy and the counter', async () => {
    // 1. Member requests book
    const reqRes = await request(app)
      .post('/api/borrow/request')
      .set('Authorization', `Bearer ${branch.memberToken}`)
      .send({ bookId: branch.book._id });
    
    const borrowingId = reqRes.body.borrowing._id;

    // 2. Member cancels request
    const cancelRes = await request(app)
      .delete(`/api/borrow/${borrowingId}/cancel`)
      .set('Authorization', `Bearer ${branch.memberToken}`);

    expect(cancelRes.status).toBe(200);

    const b = await BorrowingHistory.findById(borrowingId).crossTenant('test');
    expect(b).toBeNull(); // Should be deleted

    const copy = await BookCopy.findOne({ bookId: branch.book._id }).crossTenant('test');
    expect(copy.status).toBe('available');

    const updatedBook = await Book.findById(branch.book._id).crossTenant('test');
    expect(updatedBook.availableCopies).toBe(1);
  });

  it('A failure partway through a transaction leaves no partial changes', async () => {
    // Set up: issue book so copy is 'borrowed' and borrowing is 'Active'
    const issueRes = await request(app)
      .post('/api/borrow/issue')
      .set('Authorization', `Bearer ${branch.librarianToken}`)
      .send({
        barcode: branch.bookCopy.barcode,
        memberCode: branch.memberProfile.memberCode,
        dueDate: new Date(Date.now() + 86400000).toISOString()
      });
    expect(issueRes.status).toBe(201);
    const borrowingId = issueRes.body.borrowing._id;

    // Verify initial state
    let copy = await BookCopy.findById(branch.bookCopy._id).crossTenant('test');
    expect(copy.status).toBe('borrowed');

    // Spy on Book.updateOne to throw AFTER BorrowingHistory and BookCopy are already updated
    // This simulates a crash mid-transaction (3rd write fails)
    const spy = jest.spyOn(Book, 'updateOne').mockRejectedValueOnce(
      new Error('Simulated DB failure mid-transaction')
    );

    const returnRes = await request(app)
      .post('/api/borrow/return')
      .set('Authorization', `Bearer ${branch.librarianToken}`)
      .send({ barcode: branch.bookCopy.barcode });

    spy.mockRestore();

    // The transaction should have failed (5xx or 4xx)
    expect(returnRes.status).toBeGreaterThanOrEqual(400);

    // BorrowingHistory must still be 'Active' — transaction rolled back
    const borrowing = await BorrowingHistory.findById(borrowingId).crossTenant('test');
    expect(borrowing).not.toBeNull();
    expect(borrowing.requestStatus).toBe('Active');

    // BookCopy must still be 'borrowed' — transaction rolled back
    copy = await BookCopy.findById(branch.bookCopy._id).crossTenant('test');
    expect(copy.status).toBe('borrowed');

    // No fine should have been created — transaction rolled back
    const fines = await Fine.find({ borrowingId }).crossTenant('test');
    expect(fines.length).toBe(0);
  });
});
