const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function getJwtConfig() {
  const secret = process.env.JWT_ACCESS_SECRET;
  const issuer = process.env.JWT_ISSUER || 'college-hackathon-platform';
  const audience = process.env.JWT_AUDIENCE || 'college-hackathon-platform-users';
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';

  if (!secret || !secret.trim()) {
    throw new Error('Missing JWT_ACCESS_SECRET environment variable.');
  }

  return { secret, issuer, audience, expiresIn };
}

function generateAccessToken(user) {
  const { secret, issuer, audience, expiresIn } = getJwtConfig();

  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      jti: crypto.randomUUID(),
    },
    secret,
    {
      algorithm: 'HS256',
      expiresIn,
      issuer,
      audience,
    },
  );
}

function verifyAccessToken(token) {
  const { secret, issuer, audience } = getJwtConfig();

  return jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer,
    audience,
  });
}

function generateRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  getJwtConfig,
};
