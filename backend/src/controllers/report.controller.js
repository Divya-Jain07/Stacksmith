const BorrowingHistory = require('../models/BorrowingHistory');
const Fine = require('../models/Fine');
const BookCopy = require('../models/BookCopy');
const Member = require('../models/Member');

exports.getDashboard = async (req, res, next) => {
  try {
    const tenantFilter = req.tenantFilter || {};

    // 1. Total active borrowings
    const activeBorrows = await BorrowingHistory.countDocuments({ returnedDate: null, ...tenantFilter });

    // 2. Overdue books count
    const overdueBorrows = await BorrowingHistory.countDocuments({
      returnedDate: null,
      dueDate: { $lt: new Date() },
      ...tenantFilter
    });

    // 3. Fines collected vs pending
    const fines = await Fine.aggregate([
      { $match: tenantFilter },
      { $group: {
          _id: '$status',
          totalAmount: { $sum: '$amountToPay' },
          count: { $sum: 1 }
        }
      }
    ]);

    let finesCollected = 0;
    let finesPending = 0;
    fines.forEach(f => {
      if (f._id === 'collected') finesCollected = f.totalAmount;
      if (f._id === 'pending') finesPending = f.totalAmount;
    });

    // 4. Most active members (by borrow count)
    const activeMembers = await BorrowingHistory.aggregate([
      { $match: tenantFilter },
      { $group: { _id: '$memberId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    const memberIds = activeMembers.map(m => m._id);
    const membersData = await Member.find({ _id: { $in: memberIds }, ...tenantFilter }).select('name memberCode');

    // 5. Books needing repair
    const poorConditionBooks = await BookCopy.countDocuments({ condition: 'poor', ...tenantFilter });

    res.json({
      activeBorrows,
      overdueBorrows,
      fines: { collected: finesCollected, pending: finesPending },
      poorConditionBooks,
      topMembers: activeMembers.map(am => {
        const mem = membersData.find(m => m._id.toString() === am._id.toString());
        return {
          id: am._id,
          name: mem ? mem.name : 'Unknown',
          code: mem ? mem.memberCode : '',
          borrows: am.count
        };
      })
    });
  } catch (err) {
    next(err);
  }
};
