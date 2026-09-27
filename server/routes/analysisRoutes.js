const express = require('express');
const { param, body } = require('express-validator');
const {
  runAnalysis,
  listAnalyses,
  getLatest,
  getAnalysis,
  getSummary,
} = require('../controllers/analysisController');
const { protect } = require('../middleware/authMiddleware');
const { enforceSameOrigin } = require('../middleware/csrf');
const { analysisLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(protect);

// Static segments must be declared before the ":id" wildcard.
router.get('/stats/summary', getSummary);
router.get('/latest', getLatest);
router.get('/', listAnalyses);

// Trigger (or re-run) the AI analysis for a stored resume. POST and GET share
// the ":id" shape because GET accepts either an analysis id or a resume id.
router.post(
  '/:resumeId',
  analysisLimiter,
  enforceSameOrigin,
  [
    param('resumeId').isMongoId().withMessage('Invalid resume id'),
    body('jobId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid job id'),
  ],
  validate(),
  runAnalysis
);

router.get('/:id', getAnalysis);

module.exports = router;
