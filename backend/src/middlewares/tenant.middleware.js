/**
 * Tenant Scoping Middleware
 * Ensures queries and updates are restricted to the logged-in user's adminId.
 * SuperAdmin bypasses this restriction but cannot implicitly perform tenant operations
 * unless they specify an adminId.
 */
const tenantScope = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (req.user.role === 'SuperAdmin') {
    const mongoose = require('mongoose');
    if (req.query.adminId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.adminId)) {
        return res.status(400).json({ error: 'Invalid branch ID format provided in adminId.' });
      }
      req.tenantFilter = { adminId: new mongoose.Types.ObjectId(req.query.adminId) };
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        req.body.adminId = req.query.adminId;
      }
    } else {
      req.tenantFilter = {};
    }
  } else {
    const mongoose = require('mongoose');
    if (!req.user.adminId) {
      return res.status(403).json({ error: 'User is not assigned to any library admin scope' });
    }
    // Standard users are locked to their own adminId
    // Cast to ObjectId to ensure Mongoose aggregations work correctly
    req.tenantFilter = { adminId: new mongoose.Types.ObjectId(req.user.adminId) };

    // Prevent standard users from spoofing adminId in body
    if (req.body.adminId && req.body.adminId !== req.user.adminId) {
      return res.status(403).json({ error: 'Cannot perform actions for another library scope' });
    }
    // Automatically inject adminId into request body for creation endpoints
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      req.body.adminId = req.user.adminId;
    }
  }

  next();
};

module.exports = { tenantScope };
