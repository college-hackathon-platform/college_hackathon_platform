const { registerSchema, loginSchema, refreshTokenSchema } = require('./auth.validation');
const {
  registerUser,
  loginUser,
  refreshUserSession,
  revokeRefreshToken,
  revokeAllSessionsForUser,
  getCurrentUser,
  normalizeEmail,
} = require('./auth.service');
const { setRefreshCookie, clearRefreshCookie } = require('../../utils/cookies');

function extractRefreshToken(req) {
  const cookieName = process.env.COOKIE_NAME || 'refreshToken';

  if (req.cookies && req.cookies[cookieName]) {
    return req.cookies[cookieName];
  }

  const headerToken = req.headers['x-refresh-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim();
  }

  if (req.body && typeof req.body.refreshToken === 'string' && req.body.refreshToken.trim()) {
    return req.body.refreshToken.trim();
  }

  return null;
}

async function register(req, res, next) {
  try {
    const parsed = registerSchema.parse(req.body);
    const user = await registerUser(parsed);

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: { user },
    });
  } catch (error) {
    if (error && error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: error.issues[0]?.message || 'Invalid registration data.',
      });
    }

    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const parsed = loginSchema.parse(req.body);
    const { accessToken, refreshToken, user } = await loginUser(parsed);

    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        accessToken,
        user,
      },
    });
  } catch (error) {
    if (error && error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: error.issues[0]?.message || 'Invalid login data.',
      });
    }

    const statusCode = error && Number.isInteger(error.statusCode) ? error.statusCode : 500;
    const message = error && error.message ? error.message : 'Authentication failed.';

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
}

async function refresh(req, res, next) {
  try {
    const refreshTokenValue = extractRefreshToken(req);
    const parsed = refreshTokenSchema.parse({ refreshToken: refreshTokenValue });
    const { accessToken, refreshToken, user } = await refreshUserSession(parsed.refreshToken);

    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Refresh successful.',
      data: {
        accessToken,
        user,
      },
    });
  } catch (error) {
    if (error && error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: error.issues[0]?.message || 'Invalid refresh request.',
      });
    }

    const statusCode = error && Number.isInteger(error.statusCode) ? error.statusCode : 500;
    const message = error && error.message ? error.message : 'Failed to refresh session.';

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
}

async function logout(req, res, next) {
  try {
    const refreshTokenValue = extractRefreshToken(req);
    if (refreshTokenValue) {
      await revokeRefreshToken(refreshTokenValue);
    }

    clearRefreshCookie(res);

    return res.status(200).json({
      success: true,
      message: 'Logout successful.',
    });
  } catch (error) {
    return next(error);
  }
}

async function logoutAll(req, res, next) {
  try {
    await revokeAllSessionsForUser(req.user.id);
    clearRefreshCookie(res);

    return res.status(200).json({
      success: true,
      message: 'All sessions logged out successfully.',
    });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await getCurrentUser(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Current user retrieved successfully.',
      data: { user },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
  extractRefreshToken,
  normalizeEmail,
};
