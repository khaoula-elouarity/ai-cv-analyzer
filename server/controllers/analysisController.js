const mongoose = require('mongoose');
const Analysis = require('../models/Analysis');
const Resume = require('../models/Resume');
const User = require('../models/User');
const Job = require('../models/Job');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { analyzeResume } = require('../services/aiService');

/**
 * Gate on the fields the UI and the Analysis schema actually depend on.
 *
 * `sanitise` in the AI service already coerces every field, so reaching this
 * failure means the service contract broke rather than that the CV is bad.
 * Throwing is still better than persisting a row that renders as an empty
 * result page.
 */
const validateAnalysisPayload = (payload) => {
  const problems = [];
  if (!payload || typeof payload !== 'object') problems.push('response was not an object');
  if (!Number.isFinite(payload?.score)) problems.push('score was missing or not a number');
  if (!Array.isArray(payload?.skills)) problems.push('skills was not an array');
  if (!payload?.profile || typeof payload.profile !== 'object') {
    problems.push('profile was missing');
  }
  if (problems.length) {
    throw new ApiError(
      502,
      `The AI analysis could not be used (${problems.join('; ')}). Please try again.`
    );
  }
  return payload;
};

/**
 * @route   POST /api/analysis/:resumeId
 * @desc    Run the AI analysis for a stored resume and persist the result.
 * @access  Private
 */
const runAnalysis = asyncHandler(async (req, res) => {
  const { resumeId } = req.params;

  // Scoped to the caller so one user cannot analyse another's CV by guessing
  // an id.
  const resume = await Resume.findOne({ _id: resumeId, user: req.userId });
  if (!resume) throw ApiError.notFound('Resume not found');

  if (!resume.extractedText || resume.extractedText.trim().length < 200) {
    throw ApiError.badRequest(
      'This resume has no usable text yet. Upload it again so the text can be extracted first.'
    );
  }

  // Optional: bias the analysis toward a specific saved role.
  let targetJob = null;
  if (req.body?.jobId) {
    targetJob = await Job.findOne({ _id: req.body.jobId, user: req.userId })
      .select('title description')
      .lean();
    if (!targetJob) throw ApiError.notFound('Job not found');
  }

  resume.status = 'processing';
  await resume.save();

  try {
    const result = validateAnalysisPayload(
      await analyzeResume(resume.extractedText, targetJob)
    );

    // One analysis per resume: re-running replaces the old verdict instead of
    // leaving an orphaned row that GET-by-resumeId would have to disambiguate.
    await Analysis.deleteMany({ resume: resume._id });

    const analysis = await Analysis.create({
      resume: resume._id,
      user: req.userId,
      ...result,
    });

    resume.status = 'analyzed';
    resume.engine = result.engine || 'local';
    await resume.save();

    await User.updateOne(
      { _id: req.userId },
      {
        $inc: { 'stats.analysesRun': 1 },
        $max: { 'stats.bestScore': analysis.score },
      }
    );

    res.status(201).json({
      success: true,
      message: 'Analysis completed',
      analysisId: analysis._id,
      resumeId: resume._id,
      engine: result.engine || 'local',
      analysis,
    });
  } catch (err) {
    // Leave a visible reason on the resume rather than silently reverting to
    // "uploaded", which would suggest the extraction step never ran.
    await Resume.updateOne(
      { _id: resume._id },
      { status: 'failed', failureReason: err.message }
    ).catch(() => {});
    throw err;
  }
});

/**
 * @route   GET /api/analysis
 * @desc    List the current user's analyses, newest first.
 * @access  Private
 */
const listAnalyses = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

  const filter = { user: req.userId };
  if (req.query.resumeId) filter.resume = req.query.resumeId;

  const [analyses, total] = await Promise.all([
    Analysis.find(filter)
      .populate('resume', 'originalName createdAt fileUrl')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean({ virtuals: true }),
    Analysis.countDocuments(filter),
  ]);

  res.json({ success: true, analyses, pagination: { page, limit, total } });
});

/**
 * @route   GET /api/analysis/latest
 * @desc    Most recent analysis — powers the default dashboard state.
 * @access  Private
 */
const getLatest = asyncHandler(async (req, res) => {
  const analysis = await Analysis.findOne({ user: req.userId })
    .populate('resume', 'originalName createdAt fileUrl')
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  res.json({ success: true, analysis: analysis || null });
});

/**
 * @route   GET /api/analysis/:id
 * @desc    Fetch a single analysis. `:id` may be either an analysis id or a
 *          resume id, because both are natural handles for the UI: the upload
 *          flow returns an analysisId, while "re-analyse this resume" only has
 *          the resumeId. Analysis id is tried first to keep the existing
 *          client behaviour unchanged.
 * @access  Private
 */
const getAnalysis = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw ApiError.badRequest('Invalid analysis id');
  }

  const byAnalysis = await Analysis.findOne({ _id: id, user: req.userId })
    .populate('resume', 'originalName createdAt fileUrl')
    .lean({ virtuals: true });

  // Fall back to treating the id as a resume id, newest analysis first.
  const analysis =
    byAnalysis ||
    (await Analysis.findOne({ resume: id, user: req.userId })
      .populate('resume', 'originalName createdAt fileUrl')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true }));

  if (!analysis) throw ApiError.notFound('Analysis not found');
  res.json({ success: true, analysis });
});

/**
 * @route   GET /api/analysis/stats/summary
 * @desc    Aggregate stats for the dashboard header.
 * @access  Private
 */
const getSummary = asyncHandler(async (req, res) => {
  const [agg] = await Analysis.aggregate([
    { $match: { user: req.user._id } },
    {
      $group: {
        _id: null,
        totalAnalyses: { $sum: 1 },
        averageScore: { $avg: '$score' },
        bestScore: { $max: '$score' },
        averageAts: { $avg: '$atsScore' },
      },
    },
  ]);

  const totalResumes = await Resume.countDocuments({ user: req.userId });

  // Score history, oldest first, for the trend chart.
  const history = await Analysis.find({ user: req.userId })
    .select('score createdAt')
    .sort({ createdAt: 1 })
    .lean();

  res.json({
    success: true,
    summary: {
      totalResumes,
      totalAnalyses: agg?.totalAnalyses || 0,
      averageScore: agg?.averageScore ? Math.round(agg.averageScore) : 0,
      bestScore: agg?.bestScore || 0,
      averageAts: agg?.averageAts ? Math.round(agg.averageAts) : 0,
    },
    history: history.map((h) => ({
      score: h.score,
      date: h.createdAt,
    })),
  });
});

module.exports = { runAnalysis, listAnalyses, getLatest, getAnalysis, getSummary };
