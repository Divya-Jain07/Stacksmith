/**
 * System Constants for Library Operations
 */

const ROLES = {
  ADMIN: 'Admin',
  LIBRARIAN: 'Librarian',
  MEMBER: 'Member'
};

const BOOK_COPY_STATUS = {
  LOST: 'lost',
  DAMAGED: 'damaged',
  RESERVED: 'reserved',
  BORROWED: 'borrowed',
  AVAILABLE: 'available'
};

const BOOK_COPY_CONDITION = {
  PERFECT: 'perfect',
  OKAY: 'okay',
  POOR: 'poor'
};

const FINE_REASONS = {
  LOST: 'lost',
  OVERDUE: 'overdue',
  DAMAGED: 'damaged'
};

const FINE_STATUS = {
  PENDING: 'pending',
  COLLECTED: 'collected',
  LEFT: 'left' // waived/written-off
};

const PAYMENT_MODES = {
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  NONE: 'None'
};

const DEFAULT_DAILY_RATE = 1.00;

module.exports = {
  ROLES,
  BOOK_COPY_STATUS,
  BOOK_COPY_CONDITION,
  FINE_REASONS,
  FINE_STATUS,
  PAYMENT_MODES,
  DEFAULT_DAILY_RATE
};
