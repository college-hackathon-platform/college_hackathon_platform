const prisma = require('../config/database');
const { verifyAccessToken } = require('../utils/token');

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid access token.',
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'This account is not active and cannot access this resource.',
      });
    }

    req.user = sanitizeUser(user);
    return next();
  } catch (error) {
    const message = error && error.name === 'TokenExpiredError'
      ? 'Access token has expired.'
      : 'Invalid or malformed access token.';

    return res.status(401).json({
      success: false,
      message,
    });
  }
}

module.exports = {
  authenticate,
  sanitizeUser,
};
