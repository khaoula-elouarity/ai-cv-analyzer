const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const json = (message) => ({ success: false, message });

/** General API safety net. */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('Too many requests. Please slow down and try again shortly.'),
});

/** Credential endpoints: tight limit to blunt brute-force attempts. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProd ? 10 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: json('Too many attempts. Please wait 15 minutes before trying again.'),
});

/** AI calls are slow and billable — limit them separately. */
const analysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: env.isProd ? 20 : 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('Analysis limit reached. You have used all your analyses for this hour.'),
});

/** Uploads are the heaviest and most abusable endpoint. */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: env.isProd ? 15 : 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('Upload limit reached. Please try again later.'),
});

module.exports = { apiLimiter, authLimiter, analysisLimiter, uploadLimiter };
