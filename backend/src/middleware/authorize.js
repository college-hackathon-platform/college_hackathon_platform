const VALID_ROLES = new Set(['ADMIN', 'FACULTY', 'STUDENT']);

function authorizeRoles(...allowedRoles) {
  if (
    allowedRoles.length === 0
    || allowedRoles.some((role) => typeof role !== 'string' || !VALID_ROLES.has(role))
  ) {
    throw new TypeError('authorizeRoles requires one or more valid institutional roles.');
  }

  return function authorizeRole(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.',
      });
    }

    return next();
  };
}

module.exports = authorizeRoles;
