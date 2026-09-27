const User = require('../models/User');
const { verifyToken, COOKIE_NAME } = require('../utils/token');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/** Pull the JWT from the httpOnly cookie, falling back to a Bearer header. */
const extractToken = (req) => {
  if (req.cookies?.[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
};

/**
 * Requires a valid JWT. Populates `req.user` with the full user document and
 * `req.userId`. Supports both cookie auth (preferred) and Bearer tokens
 * (useful for mobile clients and Postman).
 */
const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Not authenticated: no token provided');

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Your session has expired. Please sign in again.'
        : 'Invalid authentication token';
    throw ApiError.unauthorized(message);
  }

  const user = await User.findById(payload.id);
  if (!user) throw ApiError.unauthorized('The user for this token no longer exists');

  req.user = user;
  req.userId = user._id;
  next();
});

/**
 * Attaches `req.user` when a valid token is present but never rejects.
 * Used for endpoints that behave differently for signed-in users.
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    req.user = await User.findById(payload.id);
    req.userId = req.user?._id;
  } catch {
    // An invalid token is simply treated as anonymous here.
  }
  next();
});

/** Restrict a route to specific roles. */
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to do that'));
    }
    next();
  };

module.exports = { protect, optionalAuth, authorize };
