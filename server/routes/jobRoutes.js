const express = require('express');
const { body, param } = require('express-validator');
const {
  listJobs,
  createJob,
  getJob,
  updateJob,
  deleteJob,
  matchDescription,
  matchJobToResume,
  createRules,
  updateRules,
} = require('../controllers/jobController');
const { protect } = require('../middleware/authMiddleware');
const { enforceSameOrigin } = require('../middleware/csrf');
const { analysisLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.get('/', listJobs);

// Path-addressed match, for clients that already know both ids and do not want
// to assemble a body. Declared before the "/:id" routes.
router.post(
  '/:jobId/match/:resumeId',
  analysisLimiter,
  enforceSameOrigin,
  [
    param('jobId').isMongoId().withMessage('Invalid job id'),
    param('resumeId').isMongoId().withMessage('Invalid resume id'),
  ],
  validate(),
  matchJobToResume
);

router.post(
  '/match',
  analysisLimiter,
  enforceSameOrigin,
  [
    // Either a saved jobId or an inline description is enough. The saved job
    // wins, so `description` is only validated for one-off pastes.
    body('jobId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid job id'),
    body('description')
      .optional({ values: 'falsy' })
      .isLength({ min: 50, max: 20000 })
      .withMessage('Job description must be 50-20000 characters'),
  ],
  validate(),
  matchDescription
);

router.post('/', enforceSameOrigin, createRules, validate(), createJob);
router.get('/:id', getJob);
router.patch('/:id', enforceSameOrigin, updateRules, validate(), updateJob);
router.delete('/:id', enforceSameOrigin, deleteJob);

module.exports = router;
