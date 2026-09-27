const fs = require('fs/promises');
const path = require('path');
const Resume = require('../models/Resume');
const Analysis = require('../models/Analysis');
const Job = require('../models/Job');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { UPLOAD_ROOT } = require('../middleware/uploadMiddleware');
const { extractText } = require('../services/pdfService');
const { analyzeResume } = require('../services/aiService');
const {
  matchAgainstJob,
  benchmarkRoles,
} = require('../services/matcherService');

/** Best-effort cleanup so a failed analysis does not leave files on disk. */
const removeFileQuietly = async (absPath) => {
  if (!absPath) return;
  try {
    await fs.unlink(absPath);
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[cleanup] failed to remove', absPath, err.message);
  }
};

/**
 * The on-disk name is random and unguessable, so it doubles as the capability
 * token for download. path.basename guarantees no traversal is possible.
 */
const absPathOf = (fileName) => path.join(UPLOAD_ROOT, path.basename(fileName));
const publicUrlOf = (fileName) => `/uploads/${path.basename(fileName)}`;

/**
 * @route   POST /api/resume/upload
 * @desc    Upload a CV, extract its text, run the AI analysis and store the result.
 * @access  Private
 */
const uploadAndAnalyze = asyncHandler(async (req, res) => {
  let resume;

  try {
    if (!req.file) {
      throw ApiError.badRequest('Please attach a CV file in the "resume" field');
    }

    // Multer has already written the file with a random, traversal-safe name.
    const fileName = path.basename(req.file.path);

    resume = await Resume.create({
      user: req.userId,
      originalName: req.file.originalname,
      fileName,
      fileUrl: publicUrlOf(fileName),
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      status: 'processing',
    });

    // 1. Extract text from the actual file contents.
    const { text, charCount, type, ocr } = await extractText(req.file.path);
    resume.extractedText = text;
    resume.charCount = charCount;
    await resume.save();

    // 2. If the user pointed at a target job, score against it.
    const targetJob = req.body?.jobId
      ? await Job.findOne({ _id: req.body.jobId, user: req.userId })
      : null;

    // 3. Analyse (always resolves; falls back to the local engine).
    const result = await analyzeResume(text, targetJob);

    // 4. Persist.
    const analysis = await Analysis.create({
      resume: resume._id,
      user: req.userId,
      ...result,
    });

    resume.status = 'analyzed';
    resume.engine = result.engine;
    await resume.save();

    await User.updateOne(
      { _id: req.userId },
      {
        $inc: { 'stats.resumesUploaded': 1, 'stats.analysesRun': 1 },
        $max: { 'stats.bestScore': result.score },
      }
    );

    // 5. If a target job was given, persist a real job match.
    //
    //    `result.score` is a general CV-quality score: analyzeResume only
    //    forwards the target job to the AI prompt, and the local engine
    //    ignores it entirely. Storing it as lastMatch would mix two
    //    different metrics, so the deterministic matcher owns this field.
    let jobMatch = null;
    if (targetJob) {
      jobMatch = matchAgainstJob(text, targetJob, result);

      targetJob.lastMatch = {
        score: jobMatch.score,
        matchedKeywords: jobMatch.matchedKeywords,
        missingKeywords: jobMatch.missingKeywords,
        computedAt: new Date(),
      };
      await targetJob.save();
    }

    res.status(201).json({
      success: true,
      message: 'CV analysed successfully',
      resumeId: resume._id,
      analysisId: analysis._id,
      extraction: { type, charCount, ...(ocr ? { ocr } : {}) },
      analysis,
      jobMatch,
    });
  } catch (err) {
    // Record the failure so the UI can show it, then clean up.
    if (resume) {
      await Resume.updateOne(
        { _id: resume._id },
        { status: 'failed', failureReason: err.message }
      ).catch(() => {});
    }
    if (req.file) await removeFileQuietly(req.file.path);
    throw err;
  }
});

/**
 * @route   GET /api/resume
 * @desc    List the current user's uploads, newest first.
 * @access  Private
 */
const listResumes = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

  const [resumes, total] = await Promise.all([
    Resume.find({ user: req.userId })
      .select('-extractedText')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean({ virtuals: true }),
    Resume.countDocuments({ user: req.userId }),
  ]);

  res.json({ success: true, resumes, pagination: { page, limit, total } });
});

/**
 * @route   GET /api/resume/:id
 * @desc    Fetch one resume with its analysis.
 * @access  Private
 */
const getResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ _id: req.params.id, user: req.userId })
    .populate('user', 'name email')
    .lean({ virtuals: true });

  if (!resume) throw ApiError.notFound('Resume not found');

  const analysis = await Analysis.findOne({ resume: resume._id }).lean({
    virtuals: true,
  });

  res.json({ success: true, resume, analysis });
});

/**
 * @route   DELETE /api/resume/:id
 * @desc    Delete a resume, its analysis and the file on disk.
 * @access  Private
 */
const deleteResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOneAndDelete({
    _id: req.params.id,
    user: req.userId,
  });
  if (!resume) throw ApiError.notFound('Resume not found');

  await Analysis.deleteMany({ resume: resume._id });
  await removeFileQuietly(absPathOf(resume.fileName || resume.fileUrl));

  res.json({ success: true, message: 'Resume deleted' });
});

/**
 * @route   GET /api/resume/:id/match/:jobId
 * @desc    Score a saved resume against a saved job description.
 * @access  Private
 */
const matchResumeToJob = asyncHandler(async (req, res) => {
  const [resume, job] = await Promise.all([
    Resume.findOne({ _id: req.params.id, user: req.userId }).select('extractedText'),
    Job.findOne({ _id: req.params.jobId, user: req.userId }),
  ]);

  if (!resume) throw ApiError.notFound('Resume not found');
  if (!job) throw ApiError.notFound('Job not found');
  if (!resume.extractedText) {
    throw ApiError.badRequest('This resume has not been processed yet');
  }

  const analysis = await Analysis.findOne({ resume: resume._id }).lean();
  const match = matchAgainstJob(resume.extractedText, job, analysis || {});

  job.lastMatch = {
    score: match.score,
    matchedKeywords: match.matchedKeywords,
    missingKeywords: match.missingKeywords,
    computedAt: new Date(),
  };
  await job.save();

  res.json({ success: true, match, job });
});

/**
 * @route   POST /api/resume/parse-text
 * @desc    Analyse pasted CV text without uploading a file.
 * @access  Private
 */
const analyzePastedText = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text || text.trim().length < 200) {
    throw ApiError.badRequest('Please paste at least 200 characters of CV text');
  }

  const result = await analyzeResume(text.trim());

  res.json({ success: true, analysis: result });
});

/**
 * @route   GET /api/resume/:id/benchmark
 * @desc    Category readiness benchmark for a saved resume.
 * @access  Private
 */
const getBenchmark = asyncHandler(async (req, res) => {
  // :id is a resume id, but the analysis hangs off it via a reference, so
  // resolve the resume first rather than searching analyses on a resume field.
  const resume = await Resume.findOne({ _id: req.params.id, user: req.userId })
    .select('_id')
    .lean();

  if (!resume) throw ApiError.notFound('Resume not found');

  const analysis = await Analysis.findOne({
    resume: resume._id,
    user: req.userId,
  }).lean();

  if (!analysis) throw ApiError.notFound('No analysis found for this resume');

  res.json({
    success: true,
    benchmark: benchmarkRoles(analysis.skills || [], analysis.profile?.yearsOfExperience || 0),
  });
});

module.exports = {
  uploadAndAnalyze,
  listResumes,
  getResume,
  deleteResume,
  matchResumeToJob,
  analyzePastedText,
  getBenchmark,
};
