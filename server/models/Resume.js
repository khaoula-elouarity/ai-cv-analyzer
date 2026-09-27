const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Display name only. The on-disk name is randomised (see uploadMiddleware).
    originalName: { type: String, required: true, trim: true },
    // Random basename on disk, e.g. "65f1...-9ab2.pdf". Unguessable, so it
    // doubles as the capability token for the download URL.
    fileName: { type: String, required: true },
    // Public path served by the static handler, e.g. "/uploads/65f1....pdf".
    fileUrl: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    extractedText: { type: String, default: '' },
    charCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['uploaded', 'processing', 'analyzed', 'failed'],
      default: 'uploaded',
      index: true,
    },
    failureReason: { type: String, default: '' },
    // Which engine produced the analysis: 'groq' | 'openai' | 'xai' | 'local'
    engine: { type: String, default: '' },
  },
  { timestamps: true }
);

resumeSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Resume', resumeSchema);
