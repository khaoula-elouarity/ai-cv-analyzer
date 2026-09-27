const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: [true, 'Job title is required'], trim: true },
    company: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: 'Remote' },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
    },
    url: { type: String, trim: true, default: '' },
    source: { type: String, default: 'Manual' },
    /** Skills the job explicitly asks for, extracted on save. */
    requiredSkills: { type: [String], default: [] },
    /** Result of the most recent match run against this job. */
    lastMatch: {
      score: { type: Number, default: null },
      matchedKeywords: { type: [String], default: [] },
      missingKeywords: { type: [String], default: [] },
      computedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

jobSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
