/**
 * Validation Utility for Library Counter Operations
 */

/**
 * Validates check-out rules for a member and book copy.
 * 
 * Rules:
 * 1. Member must be active and membership must not be expired.
 * 2. Member's active borrow count must be strictly less than their borrow limit.
 * 3. Member must not have any outstanding unpaid (pending) fines.
 * 4. The copy must be 'available' or, if 'reserved', it must be reserved for this specific member.
 * 
 * @param {Object} member - Member document
 * @param {Object} bookCopy - BookCopy document
 * @param {number} activeBorrowCount - Count of currently borrowed books by this member
 * @param {Array} outstandingFines - List of fines for this member
 * @param {Object} nextReservation - The next reservation in line for this book (if status is reserved)
 * @returns {Object} { isValid: boolean, reason: string|null }
 */
const validateCheckout = (member, bookCopy, activeBorrowCount, outstandingFines, nextReservation = null) => {
  // 1. Member Validation
  if (!member) {
    return { isValid: false, reason: 'Member profile not found.' };
  }
  if (member.status !== 'active') {
    return { isValid: false, reason: 'Member status is inactive.' };
  }
  if (new Date(member.membershipExpiryDate) < new Date()) {
    return { isValid: false, reason: 'Membership has expired.' };
  }

  // 2. Borrow Limit Validation
  if (activeBorrowCount >= member.borrowLimits) {
    return { isValid: false, reason: `Member has reached their borrow limit of ${member.borrowLimits} copies.` };
  }

  // 3. Unpaid Fines Validation
  const pendingFines = outstandingFines.filter(fine => fine.status === 'pending');
  if (pendingFines.length > 0) {
    const totalDue = pendingFines.reduce((sum, fine) => sum + fine.amountToPay, 0);
    return { isValid: false, reason: `Member has pending unpaid fines of $${totalDue.toFixed(2)}.` };
  }

  // 4. Book Copy Status Validation
  if (!bookCopy) {
    return { isValid: false, reason: 'Book copy not found.' };
  }

  if (bookCopy.status === 'lost') {
    return { isValid: false, reason: 'Book copy is marked as lost.' };
  }
  if (bookCopy.status === 'damaged') {
    return { isValid: false, reason: 'Book copy is marked as damaged and cannot be borrowed.' };
  }
  if (bookCopy.status === 'borrowed') {
    return { isValid: false, reason: 'Book copy is already checked out (borrowed).' };
  }

  if (bookCopy.status === 'reserved') {
    if (!nextReservation) {
      return { isValid: false, reason: 'Book copy is reserved, but no active reservation record was found.' };
    }
    // Check if the reservation is for this member
    if (nextReservation.requestedUserId.toString() !== member._id.toString()) {
      return { isValid: false, reason: 'Book copy is reserved for another member in the queue.' };
    }
  }

  return { isValid: true, reason: null };
};

module.exports = {
  validateCheckout
};
