const express = require('express');
const {
  uploadAndAnalyze,
  listResumes,
  getResume,
  deleteResume,
  matchResumeToJob,
  analyzePastedText,
  getBenchmark,
} = require('../controllers/resumeController');
const { handleUpload } = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { uploadLimiter, analysisLimiter } = require('../middleware/rateLimiter');
const { enforceSameOrigin } = require('../middleware/csrf');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const router = express.Router();

// Every resume route requires a valid session.
router.use(protect);

router.post(
  '/upload',
  uploadLimiter,
  enforceSameOrigin,
  handleUpload,
  uploadAndAnalyze
);

router.post(
  '/parse-text',
  analysisLimiter,
  enforceSameOrigin,
  [body('text').isLength({ min: 200 }).withMessage('Please paste at least 200 characters')],
  validate(),
  analyzePastedText
);

router.get('/', listResumes);
router.get('/:id', getResume);
router.get('/:id/benchmark', getBenchmark);
router.get('/:id/match/:jobId', matchResumeToJob);
router.delete('/:id', enforceSameOrigin, deleteResume);

module.exports = router;
