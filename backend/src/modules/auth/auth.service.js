const crypto = require('crypto');
const prisma = require('../../config/database');
const { hashPassword, verifyPassword } = require('../../utils/password');
const { generateAccessToken, generateRefreshToken, hashToken } = require('../../utils/token');
const { getRefreshCookieOptions } = require('../../utils/cookies');

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

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function getRefreshExpiry() {
  const days = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7);
  return new Date(Date.now() + (days * 24 * 60 * 60 * 1000));
}

async function registerUser({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    const error = new Error('An account with this email already exists.');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      role: 'STUDENT',
      status: 'ACTIVE',
    },
  });

  return sanitizeUser(user);
}

async function loginUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const passwordMatch = await verifyPassword(password, user.passwordHash);
  if (!passwordMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  if (user.status !== 'ACTIVE') {
    const error = new Error('This account is inactive or suspended.');
    error.statusCode = 403;
    throw error;
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: getRefreshExpiry(),
      revokedAt: null,
    },
  });

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  };
}

async function refreshUserSession(rawRefreshToken) {
  if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
    const error = new Error('Refresh token is required.');
    error.statusCode = 401;
    throw error;
  }

  const tokenHash = hashToken(rawRefreshToken);

  const result = await prisma.$transaction(async (tx) => {
    const existingToken = await tx.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existingToken) {
      const error = new Error('Invalid refresh token.');
      error.statusCode = 401;
      throw error;
    }

    if (existingToken.revokedAt || existingToken.expiresAt <= new Date()) {
      const error = new Error('Refresh token has expired or been revoked.');
      error.statusCode = 401;
      throw error;
    }

    if (existingToken.user.status !== 'ACTIVE') {
      const error = new Error('Account is not active.');
      error.statusCode = 403;
      throw error;
    }

    const revokeResult = await tx.refreshToken.updateMany({
      where: {
        id: existingToken.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    if (revokeResult.count !== 1) {
      const error = new Error('Refresh token has already been used.');
      error.statusCode = 401;
      throw error;
    }

    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashToken(newRefreshToken);

    const newTokenRecord = await tx.refreshToken.create({
      data: {
        userId: existingToken.userId,
        tokenHash: newRefreshTokenHash,
        expiresAt: getRefreshExpiry(),
      },
    });

    return {
      accessToken: generateAccessToken(existingToken.user),
      refreshToken: newRefreshToken,
      sessionId: newTokenRecord.id,
      user: sanitizeUser(existingToken.user),
    };
  });

  return result;
}

async function revokeRefreshToken(rawRefreshToken) {
  if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
    return null;
  }

  const tokenHash = hashToken(rawRefreshToken);

  const refreshToken = await prisma.refreshToken.findFirst({
    where: { tokenHash },
  });

  if (!refreshToken) {
    return null;
  }

  await prisma.refreshToken.update({
    where: { id: refreshToken.id },
    data: { revokedAt: new Date() },
  });

  return refreshToken;
}

async function revokeAllSessionsForUser(userId) {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return sanitizeUser(user);
}

module.exports = {
  sanitizeUser,
  normalizeEmail,
  registerUser,
  loginUser,
  refreshUserSession,
  revokeRefreshToken,
  revokeAllSessionsForUser,
  getCurrentUser,
  getRefreshExpiry,
  getRefreshCookieOptions,
};
