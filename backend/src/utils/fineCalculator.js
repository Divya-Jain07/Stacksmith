/**
 * Fine Calculator Utility
 */

const DEFAULT_DAILY_RATE = 1.00; // $1.00 per day by default

/**
 * Calculates late fee fine based on due date and return date.
 * @param {Date|string} dueDate 
 * @param {Date|string} returnedDate - defaults to now if not provided
 * @param {number} dailyRate - rate per day overdue
 * @returns {number} calculated fine amount
 */
const calculateOverdueFine = (dueDate, returnedDate = new Date(), dailyRate = DEFAULT_DAILY_RATE) => {
  const due = new Date(dueDate);
  const returned = new Date(returnedDate);

  // If returned before or on the due date, no fine is charged
  if (returned <= due) {
    return 0;
  }

  // Calculate the difference in milliseconds
  const diffMs = returned.getTime() - due.getTime();
  
  // Convert to days, rounding up so that any part of a day overdue counts as a full day
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays * dailyRate : 0;
};

module.exports = {
  calculateOverdueFine,
  DEFAULT_DAILY_RATE
};
