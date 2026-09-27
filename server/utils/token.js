const jwt = require('jsonwebtoken');
const env = require('../config/env');

const COOKIE_NAME = 'token';

const DURATION_UNITS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/**
 * Convert a JWT_EXPIRES_IN string ("7d", "12h", "30m") to milliseconds so the
 * cookie and the token itself expire at the same moment.
 */
const durationToMs = (value) => {
  const match = /^(\d+)\s*([smhd])?$/.exec(String(value).trim());
  if (!match) return 7 * DURATION_UNITS.d;
  const amount = Number(match[1]);
  const unit = match[2] || 's';
  return amount * (DURATION_UNITS[unit] ?? DURATION_UNITS.d);
};

/** @returns {string} signed JWT containing `{ id }` */
const signToken = (userId) =>
  jwt.sign({ id: userId.toString() }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    issuer: 'ai-cv-analyzer',
  });

/** @returns {object} decoded payload */
const verifyToken = (token) =>
  jwt.verify(token, env.jwtSecret, { issuer: 'ai-cv-analyzer' });

/**
 * Attach the JWT as an httpOnly cookie so it is not reachable from JS and
 * therefore not exfiltratable via XSS. `secure` + `sameSite=none` are used in
 * production so the cookie still works when client and API are on different
 * sites (Vercel -> Render).
 */
const setAuthCookie = (res, token) => {
  const maxAgeMs = durationToMs(env.jwtExpiresIn);

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    maxAge: maxAgeMs,
    path: '/',
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: '/',
  });
};

module.exports = {
  COOKIE_NAME,
  durationToMs,
  signToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
};
