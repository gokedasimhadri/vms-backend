const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token and attach decoded user to req.user.
 * Rejects with 401 if token is missing, invalid, or expired.
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.user) {
      return res.status(401).json({ message: 'Invalid token payload.' });
    }

    req.user = decoded.user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

/**
 * Middleware factory to enforce specific user role.
 * Requires requireAuth to have run prior.
 */
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions.' });
    }
    next();
  };
};

module.exports = {
  requireAuth,
  requireRole
};
