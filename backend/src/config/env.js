function getNumberEnv(name, fallback) {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue === '') {
    return fallback;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function validateAuthConfig() {
  const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET'];

  for (const key of required) {
    if (!process.env[key] || !String(process.env[key]).trim()) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  if (process.env.NODE_ENV === 'production' && process.env.JWT_ACCESS_SECRET.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be at least 32 characters in production.');
  }

  const clientUrl = String(process.env.CLIENT_URL || '').trim().replace(/^['"]|['"]$/g, '');

  if (!clientUrl || !/^https?:\/\//.test(clientUrl)) {
    throw new Error('CLIENT_URL must be a valid http(s) URL.');
  }

  return {
    port: getNumberEnv('PORT', 5000),
    clientUrl,
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    jwtIssuer: process.env.JWT_ISSUER || 'college-hackathon-platform',
    jwtAudience: process.env.JWT_AUDIENCE || 'college-hackathon-platform-users',
    refreshTokenExpiresDays: getNumberEnv('REFRESH_TOKEN_EXPIRES_DAYS', 7),
    cookieName: process.env.COOKIE_NAME || 'refreshToken',
    cookieSecure: process.env.COOKIE_SECURE === 'true',
    cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
  };
}

function getMailConfig() {
  const host = String(process.env.SMTP_HOST || '').trim();
  const port = getNumberEnv('SMTP_PORT', 587);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();
  const fromName = String(process.env.MAIL_FROM_NAME || 'College Hackathon Platform').trim();
  const fromEmail = String(process.env.MAIL_FROM_EMAIL || '').trim();
  const frontendUrl = String(process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\/$/, '');

  return {
    configured: Boolean(host && port && user && pass && fromEmail),
    host,
    port,
    secure,
    user,
    pass,
    fromName,
    fromEmail,
    frontendUrl,
  };
}

module.exports = {
  validateAuthConfig,
  getNumberEnv,
  getMailConfig,
};
