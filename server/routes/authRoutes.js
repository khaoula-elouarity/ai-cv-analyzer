const express = require('express');
const {
  register,
  login,
  logout,
  getMe,
  updateMe,
  changePassword,
  registerRules,
  loginRules,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const { enforceSameOrigin } = require('../middleware/csrf');
const validate = require('../middleware/validate');
const { body } = require('express-validator');

const router = express.Router();

// `enforceSameOrigin` guards every state-changing auth route, including
// login and register. Because the session lives in an httpOnly cookie, a
// hostile page can make the browser send a credentialed login cross-origin;
// rejecting the origin here is what stops "login CSRF". The guard passes when
// there is no Origin header (curl, mobile, server-to-server).
router.post('/register', authLimiter, enforceSameOrigin, registerRules, validate(), register);
router.post('/login', authLimiter, enforceSameOrigin, loginRules, validate(), login);
router.post('/logout', enforceSameOrigin, logout);

router.get('/me', protect, getMe);

router.patch(
  '/me',
  protect,
  enforceSameOrigin,
  [body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters')],
  validate(),
  updateMe
);

router.post(
  '/change-password',
  protect,
  enforceSameOrigin,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/[a-z]/i)
      .withMessage('New password must contain a letter')
      .matches(/\d/)
      .withMessage('New password must contain a number'),
  ],
  validate(),
  changePassword
);

module.exports = router;
