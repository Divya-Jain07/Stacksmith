const jwt = require('jsonwebtoken');

/**
 * Auth Middleware - Verifies JWT token from Authorization header.
 * Usage: Add to any route that needs protection.
 * 
 * Header format: Authorization: Bearer <token>
 */
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, name, email, role, staffProfileId }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

/**
 * Role-based access middleware.
 * Usage: router.post('/admin-only', auth, authorize('Admin'), controller)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // SuperAdmin bypasses role checks or add it explicitly
    if (!req.user || (!roles.includes(req.user.role) && req.user.role !== 'SuperAdmin')) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

/**
 * Middleware for member self-service endpoints.
 * Allows access if the user is a staff member, or if the requested memberId matches the user's member profile.
 * 
 * Options:
 *   skipIdCheck (boolean) - If true, skips comparing req.params.id to the member's profile ID.
 *     Use this when :id refers to a resource (e.g., borrowing record) rather than a member ID.
 *     The controller is expected to enforce ownership in this case.
 */
const requireSelfOrStaff = (options = {}) => {
  const { skipIdCheck = false } = options;

  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    if (req.user.role === 'Admin' || req.user.role === 'Librarian' || req.user.role === 'SuperAdmin') {
      return next();
    }

    // If Member, verify the ID matches their profile
    if (req.user.role === 'Member') {
      const Member = require('../models/Member');
      const member = await Member.findOne({ userId: req.user.id });
      if (!member) return res.status(403).json({ error: 'Member profile not found.' });

      // Unless skipIdCheck is set, verify :id matches the member's own profile
      if (!skipIdCheck) {
        const targetId = req.params.id;
        if (targetId && targetId !== member._id.toString()) {
          return res.status(403).json({ error: 'Access denied. Can only access your own profile.' });
        }
      }
      
      // Inject member profile ID into request for convenience
      req.memberProfileId = member._id;
      return next();
    }

    return res.status(403).json({ error: 'Access denied.' });
  };
};

module.exports = { auth, authorize, requireSelfOrStaff };
