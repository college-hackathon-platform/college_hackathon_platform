const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('./auth.controller');
const { authenticate } = require('../../middleware/authenticate');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
  statusCode: 429,
});

function enforceBrowserOrigin(req, res, next) {
  const clientOrigin = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  const requestOrigin = req.headers.origin || req.headers.referer;

  if (!requestOrigin) {
    return next();
  }

  const expectedOrigin = new URL(clientOrigin).origin;
  const requestUrl = typeof requestOrigin === 'string' ? new URL(requestOrigin) : null;

  if (!requestUrl || requestUrl.origin !== expectedOrigin) {
    return res.status(403).json({
      success: false,
      message: 'Request origin is not allowed.',
    });
  }

  return next();
}

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authLimiter, enforceBrowserOrigin, authController.refresh);
router.post('/logout', enforceBrowserOrigin, authController.logout);
router.post('/logout-all', authenticate, enforceBrowserOrigin, authController.logoutAll);
router.get('/me', authenticate, authController.me);

module.exports = router;
