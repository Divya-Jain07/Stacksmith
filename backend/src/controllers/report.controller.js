const BorrowingHistory = require('../models/BorrowingHistory');
const Fine = require('../models/Fine');
const BookCopy = require('../models/BookCopy');
const Member = require('../models/Member');

exports.getDashboard = async (req, res, next) => {
  try {
    const tenantFilter = req.tenantFilter || {};
    // When tenantFilter has no adminId (SuperAdmin), queries are intentionally cross-tenant.
    const isCrossTenant = !tenantFilter.adminId;
    const CT = 'SuperAdmin getDashboard: intentional cross-tenant aggregate stats view';

    // 1. Total active borrowings
    const activeBorrowsQ = BorrowingHistory.countDocuments({ returnedDate: null, ...tenantFilter });
    if (isCrossTenant) activeBorrowsQ.crossTenant(CT);
    const activeBorrows = await activeBorrowsQ;

    // 2. Overdue books count
    const overdueQ = BorrowingHistory.countDocuments({
      returnedDate: null,
      dueDate: { $lt: new Date() },
      ...tenantFilter
    });
    if (isCrossTenant) overdueQ.crossTenant(CT);
    const overdueBorrows = await overdueQ;

    // 3. Fines collected vs pending
    const finesAgg = Fine.aggregate([
      { $match: isCrossTenant ? {} : tenantFilter },
      { $group: {
          _id: '$status',
          totalAmount: { $sum: '$amountToPay' },
          count: { $sum: 1 }
        }
      }
    ]);
    if (isCrossTenant) finesAgg.crossTenant(CT);
    const fines = await finesAgg;

    let finesCollected = 0;
    let finesPending = 0;
    fines.forEach(f => {
      if (f._id === 'collected') finesCollected = f.totalAmount;
      if (f._id === 'pending') finesPending = f.totalAmount;
    });

    // 4. Most active members (by borrow count)
    const activeMembersAgg = BorrowingHistory.aggregate([
      { $match: isCrossTenant ? {} : tenantFilter },
      { $group: { _id: '$memberId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    if (isCrossTenant) activeMembersAgg.crossTenant(CT);
    const activeMembers = await activeMembersAgg;

    const memberIds = activeMembers.map(m => m._id);
    const membersDataQ = Member.find({ _id: { $in: memberIds }, ...tenantFilter }).select('name memberCode');
    if (isCrossTenant) membersDataQ.crossTenant(CT);
    const membersData = await membersDataQ;

    // 5. Books needing repair
    const poorQ = BookCopy.countDocuments({ condition: 'poor', ...tenantFilter });
    if (isCrossTenant) poorQ.crossTenant(CT);
    const poorConditionBooks = await poorQ;

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
