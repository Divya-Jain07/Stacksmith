const request = require('supertest');
const app = require('../src/app');
const { createBranch } = require('./factory');
const { Book, BookCopy, Member, Fine, BorrowingHistory, User } = require('../src/models');
const { getTenantGuardMode } = require('../src/plugins/tenantGuard');

describe('Comprehensive Problem Fixes & Regressions (Problems 1-13)', () => {
  let branchA, branchB;

  beforeEach(async () => {
    branchA = await createBranch();
    branchB = await createBranch();
  });

  // Problem 1: Member fines isolation & fail closed requireSelfOrStaff
  describe('Problem 1: Member fines isolation', () => {
    it('A member requesting another members fines via /member/:memberId gets 403', async () => {
      const res = await request(app)
        .get(`/api/fines/member/${branchB.memberProfile._id}`)
        .set('Authorization', `Bearer ${branchA.memberToken}`);
      expect(res.status).toBe(403);
    });

    it('A member can still read their own fines through /api/members/me/fines', async () => {
      const res = await request(app)
        .get('/api/members/me/fines')
        .set('Authorization', `Bearer ${branchA.memberToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('Staff can list fines for a member via /api/fines/member/:memberId', async () => {
      const res = await request(app)
        .get(`/api/fines/member/${branchA.memberProfile._id}`)
        .set('Authorization', `Bearer ${branchA.librarianToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // Problem 2: Member profile self-update allow-list & staff-only protection
  describe('Problem 2: Member update allow-lists', () => {
    it('A member trying to update borrowLimits gets 403 and nothing changes', async () => {
      const res = await request(app)
        .put(`/api/members/${branchA.memberProfile._id}`)
        .set('Authorization', `Bearer ${branchA.memberToken}`)
        .send({ borrowLimits: 99 });
      expect(res.status).toBe(403);

      const member = await Member.findById(branchA.memberProfile._id).crossTenant('test assertion');
      expect(member.borrowLimits).not.toBe(99);
    });

    it('A member trying to update status gets 403 and nothing changes', async () => {
      const res = await request(app)
        .put(`/api/members/${branchA.memberProfile._id}`)
        .set('Authorization', `Bearer ${branchA.memberToken}`)
        .send({ status: 'inactive' });
      expect(res.status).toBe(403);
    });

    it('A member can update an allowed profile field (name, phone)', async () => {
      const res = await request(app)
        .put(`/api/members/${branchA.memberProfile._id}`)
        .set('Authorization', `Bearer ${branchA.memberToken}`)
        .send({ name: 'Updated Self Name', phone: '9998887776' });
      expect(res.status).toBe(200);

      const member = await Member.findById(branchA.memberProfile._id).crossTenant('test assertion');
      expect(member.name).toBe('Updated Self Name');
    });

    it('Staff can update membership type, borrowLimits, status', async () => {
      const res = await request(app)
        .put(`/api/members/${branchA.memberProfile._id}`)
        .set('Authorization', `Bearer ${branchA.librarianToken}`)
        .send({ borrowLimits: 10, membershipType: 'Faculty', status: 'active' });
      expect(res.status).toBe(200);

      const member = await Member.findById(branchA.memberProfile._id).crossTenant('test assertion');
      expect(member.borrowLimits).toBe(10);
      expect(member.membershipType).toBe('Faculty');
    });

    it('A staff request containing userId or memberCode does not change them', async () => {
      const oldCode = branchA.memberProfile.memberCode;
      const oldUserId = branchA.memberProfile.userId.toString();

      const res = await request(app)
        .put(`/api/members/${branchA.memberProfile._id}`)
        .set('Authorization', `Bearer ${branchA.librarianToken}`)
        .send({ userId: branchB.memberProfile.userId, memberCode: 'HACKED_CODE', name: 'Valid Staff Edit' });
      expect(res.status).toBe(200);

      const member = await Member.findById(branchA.memberProfile._id).crossTenant('test assertion');
      expect(member.userId.toString()).toBe(oldUserId);
      expect(member.memberCode).toBe(oldCode);
      expect(member.name).toBe('Valid Staff Edit');
    });
  });

  // Problem 3: createBook ignores client counters & embedding fields
  describe('Problem 3: createBook hardening', () => {
    it('createBook ignores client-supplied counters and embedding fields', async () => {
      const payload = {
        name: 'Hacked Book',
        author: 'Hacker',
        isbn: `ISBN_HACK_${Date.now()}`,
        genre: 'Tech',
        language: 'English',
        publisher: 'Test Pub',
        yearPublished: 2024,
        totalCopies: 999,
        availableCopies: 999,
        embedding: [0.1, 0.2, 0.3],
        numberOfCopies: 2
      };

      const res = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${branchA.librarianToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      const bookId = res.body.book._id;

      const savedBook = await Book.findById(bookId).crossTenant('test assertion');
      expect(savedBook.totalCopies).toBe(2);
      expect(savedBook.availableCopies).toBe(2);
      expect(savedBook.totalCopies).not.toBe(999);
      expect(savedBook.availableCopies).not.toBe(999);
    });
  });

  // Problem 5: Search does not crash on special regex chars
  describe('Problem 5: Safe search input', () => {
    it('Searches for C++, (, [, and a.b return 200 without throwing 500', async () => {
      const queries = ['C++', '(', '[', 'a.b', 'test?query*', 'a'.repeat(200)];
      for (const q of queries) {
        const res = await request(app)
          .get(`/api/books/search?q=${encodeURIComponent(q)}`)
          .set('Authorization', `Bearer ${branchA.librarianToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      }
    });
  });

  // Problem 6: Embedding fields hidden in normal queries & per-user limits
  describe('Problem 6: Embedding data hiding and protection', () => {
    it('Book queries do not include embedding fields by default', async () => {
      const res = await request(app)
        .get(`/api/books/${branchA.book._id}`)
        .set('Authorization', `Bearer ${branchA.librarianToken}`);

      expect(res.status).toBe(200);
      expect(res.body.embedding).toBeUndefined();
      expect(res.body.embeddingHash).toBeUndefined();
      expect(res.body.embeddingModel).toBeUndefined();
    });

    it('Search returns results without embedding vectors', async () => {
      const res = await request(app)
        .get(`/api/books/search?q=${encodeURIComponent(branchA.book.name)}`)
        .set('Authorization', `Bearer ${branchA.librarianToken}`);

      expect(res.status).toBe(200);
      if (res.body.length > 0) {
        expect(res.body[0].embedding).toBeUndefined();
      }
    });

    it('Per-user rate limit returns 429 when user exceeds 15 searches/min', async () => {
      const embeddingService = require('../src/services/embedding.service');
      embeddingService._clearUserRateLimitsForTest();

      // Trigger 15 searches
      for (let i = 0; i < 15; i++) {
        await request(app)
          .get(`/api/books/search?q=query${i}`)
          .set('Authorization', `Bearer ${branchA.memberToken}`);
      }

      // 16th search should return 429
      const res = await request(app)
        .get('/api/books/search?q=query_limit')
        .set('Authorization', `Bearer ${branchA.memberToken}`);

      expect(res.status).toBe(429);
      expect(res.body.error).toMatch(/Rate limit exceeded/);

      embeddingService._clearUserRateLimitsForTest();
    });
  });

  // Problem 9: SuperAdmin malformed branch id returns 400
  describe('Problem 9: SuperAdmin tenant filter validation', () => {
    it('A malformed adminId in SuperAdmin query returns 400', async () => {
      const superAdminToken = require('jsonwebtoken').sign(
        { id: branchA.adminUser._id, role: 'SuperAdmin' },
        process.env.JWT_SECRET
      );

      const res = await request(app)
        .get('/api/fines?adminId=invalid-not-an-id')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid branch ID format/);
    });
  });

  // Problem 10: Query string object injection protection
  describe('Problem 10: Query parser hardening', () => {
    it('Bracketed operator syntax ?status[$ne]=pending returns 400 on fines list', async () => {
      const res = await request(app)
        .get('/api/fines?status[$ne]=pending')
        .set('Authorization', `Bearer ${branchA.librarianToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  // Problem 11: Renewal date validation
  describe('Problem 11: Renewal date validation', () => {
    let activeBorrowing;

    beforeEach(async () => {
      await BookCopy.updateOne({ _id: branchA.bookCopy._id, adminId: branchA.adminId }, { $set: { status: 'borrowed' } });
      activeBorrowing = await BorrowingHistory.create({
        bookCopyId: branchA.bookCopy._id,
        memberId: branchA.memberProfile._id,
        dueDate: new Date(Date.now() + 5 * 86400000), // Due in 5 days
        borrowedDate: new Date(),
        requestStatus: 'Active',
        adminId: branchA.adminId
      });
    });

    it('Rejects invalid date string with 400', async () => {
      const res = await request(app)
        .post('/api/borrow/renew')
        .set('Authorization', `Bearer ${branchA.librarianToken}`)
        .send({ barcode: branchA.bookCopy.barcode, newDueDate: 'not-a-date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid renewal due date/);
    });

    it('Rejects past date or earlier than current due date with 400', async () => {
      const pastDate = new Date(Date.now() + 2 * 86400000).toISOString(); // Earlier than current 5 days due
      const res = await request(app)
        .post('/api/borrow/renew')
        .set('Authorization', `Bearer ${branchA.librarianToken}`)
        .send({ barcode: branchA.bookCopy.barcode, newDueDate: pastDate });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/later than the current due date/);
    });

    it('Rejects extension beyond 30 days from today with 400', async () => {
      const farFuture = new Date(Date.now() + 45 * 86400000).toISOString();
      const res = await request(app)
        .post('/api/borrow/renew')
        .set('Authorization', `Bearer ${branchA.librarianToken}`)
        .send({ barcode: branchA.bookCopy.barcode, newDueDate: farFuture });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cannot be more than 30 days/);
    });

    it('Accepts valid future date within 30 days', async () => {
      const validDate = new Date(Date.now() + 10 * 86400000).toISOString();
      const res = await request(app)
        .post('/api/borrow/renew')
        .set('Authorization', `Bearer ${branchA.librarianToken}`)
        .send({ barcode: branchA.bookCopy.barcode, newDueDate: validDate });

      expect(res.status).toBe(200);
      expect(new Date(res.body.borrowing.dueDate).toISOString()).toBe(validDate);
    });
  });

  // Problem 12: Fine collection records collector for all roles
  describe('Problem 12: Cash collection tracking for Admin & SuperAdmin', () => {
    it('Collecting a fine as Admin records collectedByUser', async () => {
      const fine = await Fine.create({
        borrowingId: new (require('mongoose').Types.ObjectId)(),
        borrowedUser: branchA.memberProfile._id,
        amountToPay: 50,
        reason: 'overdue',
        status: 'pending',
        adminId: branchA.adminId
      });

      // Admin Token
      const adminToken = require('jsonwebtoken').sign(
        { id: branchA.adminUser._id, role: 'Admin', adminId: branchA.adminId },
        process.env.JWT_SECRET
      );

      const res = await request(app)
        .post(`/api/fines/${fine._id}/pay`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      const updated = await Fine.findById(fine._id).crossTenant('test assertion');
      expect(updated.status).toBe('collected');
      expect(updated.collectedByUser.toString()).toBe(branchA.adminUser._id.toString());
      expect(updated.paymentMode).toBe('Cash');
    });
  });

  // Problem 4: Tenant Guard default mode logic
  describe('Problem 4: Tenant Guard default mode', () => {
    it('Mode helper returns enforce in production environment when TENANT_GUARD is unset', () => {
      const oldEnv = process.env.NODE_ENV;
      const oldGuard = process.env.TENANT_GUARD;
      delete process.env.TENANT_GUARD;

      process.env.NODE_ENV = 'production';
      expect(getTenantGuardMode()).toBe('enforce');

      process.env.NODE_ENV = 'development';
      expect(getTenantGuardMode()).toBe('warn');

      process.env.NODE_ENV = oldEnv;
      if (oldGuard) process.env.TENANT_GUARD = oldGuard;
    });
  });
});
