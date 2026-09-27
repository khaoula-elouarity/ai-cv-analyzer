const { body } = require('express-validator');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken, setAuthCookie, clearAuthCookie } = require('../utils/token');

/**
 * Build the public user payload. Never include the password hash.
 */
const publicUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  stats: user.stats,
  createdAt: user.createdAt,
});

/**
 * @route   POST /api/auth/register
 * @desc    Create an account, set the auth cookie, return the user.
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw ApiError.conflict('An account with that email already exists');
  }

  // The pre-save hook hashes the password with bcrypt (12 rounds).
  const user = await User.create({ name, email, password });

  const token = signToken(user._id);
  setAuthCookie(res, token);
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    user: publicUser(user),
  });
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate and set the auth cookie.
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // `password` is `select:false`, so it must be requested explicitly.
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+password'
  );

  // One generic message for both branches so the API never reveals whether an
  // email is registered.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Incorrect email or password');
  }

  const token = signToken(user._id);
  setAuthCookie(res, token);

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    message: 'Signed in successfully',
    user: publicUser(user),
  });
});

/**
 * @route   POST /api/auth/logout
 * @desc    Clear the auth cookie.
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Signed out successfully' });
});

/**
 * @route   GET /api/auth/me
 * @desc    Return the currently authenticated user. Used on app boot to
 *          restore a session from the httpOnly cookie.
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});

/**
 * @route   PATCH /api/auth/me
 * @desc    Update the current user's profile.
 * @access  Private
 */
const updateMe = asyncHandler(async (req, res) => {
  const { name, avatar } = req.body;

  if (name) req.user.name = name;
  if (avatar !== undefined) req.user.avatar = avatar;

  await req.user.save();
  res.json({ success: true, message: 'Profile updated', user: publicUser(req.user) });
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change the password of the current user.
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.userId).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Your current password is incorrect');
  }

  user.password = newPassword; // re-hashed by the pre-save hook
  await user.save();

  // Re-issue the cookie so the session lifetime restarts.
  setAuthCookie(res, signToken(user._id));
  res.json({ success: true, message: 'Password changed successfully' });
});

/** express-validator rules, kept next to the handlers they guard. */
const registerRules = [
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/i)
    .withMessage('Password must contain a letter')
    .matches(/\d/)
    .withMessage('Password must contain a number'),
];

const loginRules = [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateMe,
  changePassword,
  registerRules,
  loginRules,
  publicUser,
};
