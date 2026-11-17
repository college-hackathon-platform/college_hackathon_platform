function getRefreshCookieOptions() {
  const refreshTokenExpiresDays = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7);
  const maxAge = refreshTokenExpiresDays * 24 * 60 * 60 * 1000;

  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    path: '/api/v1/auth',
    maxAge,
  };
}

function setRefreshCookie(res, token) {
  res.cookie(process.env.COOKIE_NAME || 'refreshToken', token, getRefreshCookieOptions());
}

function clearRefreshCookie(res) {
  const cookieOptions = getRefreshCookieOptions();
  res.clearCookie(process.env.COOKIE_NAME || 'refreshToken', {
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
  });
}

module.exports = {
  getRefreshCookieOptions,
  setRefreshCookie,
  clearRefreshCookie,
};
