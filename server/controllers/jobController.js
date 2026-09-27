const { body } = require('express-validator');
const Job = require('../models/Job');
const Analysis = require('../models/Analysis');
const Resume = require('../models/Resume');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  matchAgainstJob,
  extractRequiredSkills,
} = require('../services/matcherService');
const { matchResumeWithJob, analyzeResume } = require('../services/aiService');

/**
 * @route   GET /api/jobs
 * @desc    List the current user's saved job descriptions.
 * @access  Private
 */
const listJobs = asyncHandler(async (req, res) => {
  const jobs = await Job.find({ user: req.userId })
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  res.json({ success: true, jobs });
});

/**
 * @route   POST /api/jobs
 * @desc    Save a job description, auto-extracting its required skills.
 * @access  Private
 */
const createJob = asyncHandler(async (req, res) => {
  const { title, company, location, description, url } = req.body;

  const job = await Job.create({
    user: req.userId,
    title,
    company: company || '',
    location: location || 'Remote',
    description,
    url: url || '',
    requiredSkills: extractRequiredSkills(description),
  });

  res.status(201).json({ success: true, message: 'Job saved', job });
});

/**
 * @route   GET /api/jobs/:id
 * @desc    Fetch one saved job.
 * @access  Private
 */
const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, user: req.userId }).lean({
    virtuals: true,
  });
  if (!job) throw ApiError.notFound('Job not found');
  res.json({ success: true, job });
});

/**
 * @route   PATCH /api/jobs/:id
 * @desc    Update a saved job.
 * @access  Private
 */
const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, user: req.userId });
  if (!job) throw ApiError.notFound('Job not found');

  const { title, company, location, description, url } = req.body;
  if (title) job.title = title;
  if (company !== undefined) job.company = company;
  if (location !== undefined) job.location = location;
  if (url !== undefined) job.url = url;
  if (description) {
    job.description = description;
    job.requiredSkills = extractRequiredSkills(description);
    job.lastMatch.computedAt = null; // stale match must be recomputed
  }

  await job.save();
  res.json({ success: true, message: 'Job updated', job });
});

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete a saved job.
 * @access  Private
 */
const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!job) throw ApiError.notFound('Job not found');
  res.json({ success: true, message: 'Job deleted' });
});

/**
 * @route   POST /api/jobs/match
 * @desc    Score the user's latest CV against a job description. Works for a
 *          one-off pasted description, and persists `lastMatch` when the
 *          caller passes the id of a job they have already saved.
 * @access  Private
 */
const matchDescription = asyncHandler(async (req, res) => {
  const { title, description, analysisId, jobId } = req.body;

  // A saved job is the source of truth, so a client cannot smuggle in a
  // different description under someone else's id.
  let savedJob = null;
  if (jobId) {
    savedJob = await Job.findOne({ _id: jobId, user: req.userId });
    if (!savedJob) throw ApiError.notFound('Job not found');
  } else if (!description || description.length < 50) {
    throw ApiError.badRequest('Please provide a job description of at least 50 characters');
  }

  const analysis = await Analysis.findOne(
    analysisId ? { _id: analysisId, user: req.userId } : { user: req.userId }
  )
    .sort({ createdAt: -1 })
    .lean();

  if (!analysis) {
    throw ApiError.badRequest('Upload and analyse a CV before matching against a job');
  }

  const resume = await Resume.findById(analysis.resume).select('extractedText').lean();
  if (!resume?.extractedText) {
    throw ApiError.badRequest('The stored CV has no extractable text');
  }

  const target = savedJob || {
    title: title || 'Target role',
    description,
    requiredSkills: extractRequiredSkills(description),
  };

  const match = matchAgainstJob(resume.extractedText, target, analysis);

  if (savedJob) {
    savedJob.lastMatch = {
      score: match.score,
      matchedKeywords: match.matchedKeywords,
      missingKeywords: match.missingKeywords,
      computedAt: new Date(),
    };
    await savedJob.save();
  }

  res.json({
    success: true,
    match,
    requiredSkills: target.requiredSkills || [],
    analysisId: analysis._id,
    // Echo the saved job so the client can replace its cached copy with the
    // server's authoritative version instead of patching it optimistically.
    job: savedJob || null,
  });
});

/**
 * @route   POST /api/jobs/:jobId/match/:resumeId
 * @desc    AI-powered match of one saved job against one saved resume.
 *          Both documents are scoped to the caller.
 * @access  Private
 */
const matchJobToResume = asyncHandler(async (req, res) => {
  const { jobId, resumeId } = req.params;

  const [job, resume] = await Promise.all([
    Job.findOne({ _id: jobId, user: req.userId }),
    Resume.findOne({ _id: resumeId, user: req.userId }),
  ]);

  if (!job) throw ApiError.notFound('Job not found');
  if (!resume) throw ApiError.notFound('Resume not found');
  if (!resume.extractedText) {
    throw ApiError.badRequest('This resume has not been processed yet');
  }

  // Prefer the stored analysis: it is a richer profile than raw text and
  // already has structured skills. Re-analyse on demand if it is missing.
  let profile = await Analysis.findOne({ resume: resume._id, user: req.userId }).lean();

  if (!profile) {
    const result = await analyzeResume(resume.extractedText);
    profile = await Analysis.create({
      resume: resume._id,
      user: req.userId,
      ...result,
    });
  }

  const match = await matchResumeWithJob(profile, job.description, {
    title: job.title,
    requiredSkills: job.requiredSkills,
  });

  job.lastMatch = {
    score: match.score,
    matchedKeywords: match.matchedKeywords,
    missingKeywords: match.missingKeywords,
    computedAt: new Date(),
  };
  await job.save();

  res.json({
    success: true,
    match,
    requiredSkills: job.requiredSkills,
    analysisId: profile._id,
    job,
  });
});

const createRules = [
  body('title').trim().isLength({ min: 2, max: 120 }).withMessage('Job title is required'),
  body('company').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  body('description')
    .trim()
    .isLength({ min: 50, max: 20000 })
    .withMessage('Job description must be 50-20000 characters'),
  body('url').optional({ values: 'falsy' }).isURL().withMessage('Enter a valid URL'),
];

const updateRules = [
  body('title').optional().trim().isLength({ min: 2, max: 120 }).withMessage('Job title is too short'),
  body('url').optional({ values: 'falsy' }).isURL().withMessage('Enter a valid URL'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 50, max: 20000 })
    .withMessage('Job description must be 50-20000 characters'),
];

module.exports = {
  listJobs,
  createJob,
  getJob,
  updateJob,
  deleteJob,
  matchDescription,
  matchJobToResume,
  createRules,
  updateRules,
};
