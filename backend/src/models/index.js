/**
 * Models index — exports every Mongoose model used in Stacksmith.
 *
 * Import order matters: the tenantGuard plugin reads TENANT_GUARD at the time
 * each schema's plugin() call executes, so tests must set the env variable
 * BEFORE requiring this file (or any individual model).
 *
 * Tenant-guarded models (carry adminId, isolated per branch):
 *   Book, BookCopy, Member, LibrarianStaff,
 *   BorrowingHistory, BookReservation, Fine, Conversation
 *
 * Exempt models (intentionally cross-tenant):
 *   User  — identity root, legitimately spans tenants
 *   Message — scoped only through its conversation (no adminId on schema)
 */

'use strict';

const Book             = require('./Book');
const BookCopy         = require('./BookCopy');
const Member           = require('./Member');
const LibrarianStaff   = require('./LibrarianStaff');
const BorrowingHistory = require('./BorrowingHistory');
const BookReservation  = require('./BookReservation');
const Fine             = require('./Fine');
const Conversation     = require('./Conversation');
const User             = require('./User');
const Message          = require('./Message');

module.exports = {
  Book,
  BookCopy,
  Member,
  LibrarianStaff,
  BorrowingHistory,
  BookReservation,
  Fine,
  Conversation,
  User,
  Message,
};
