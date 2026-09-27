const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: 'Other' },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      default: 'Intermediate',
    },
    // How many times the term appeared in the resume — a proxy for depth.
    mentions: { type: Number, default: 1 },
  },
  { _id: false }
);

const analysisSchema = new mongoose.Schema(
  {
    resume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // 0-100 overall CV quality score.
    score: { type: Number, required: true, min: 0, max: 100 },
    // Breakdown that makes the score explainable to the user.
    scoreBreakdown: {
      skills: { type: Number, default: 0 },
      experience: { type: Number, default: 0 },
      education: { type: Number, default: 0 },
      formatting: { type: Number, default: 0 },
      keywords: { type: Number, default: 0 },
    },
    atsScore: { type: Number, default: 0, min: 0, max: 100 },

    profile: {
      fullName: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      location: { type: String, default: '' },
      links: { type: [String], default: [] },
      summary: { type: String, default: '' },
      yearsOfExperience: { type: Number, default: 0 },
    },

    skills: { type: [skillSchema], default: [] },
    /** Skills the candidate has that the target role wants. */
    matchedKeywords: { type: [String], default: [] },
    /** High-value ATS keywords absent from the resume. */
    missingKeywords: { type: [String], default: [] },

    experience: { type: [mongoose.Schema.Types.Mixed], default: [] },
    education: { type: [mongoose.Schema.Types.Mixed], default: [] },
    certifications: { type: [String], default: [] },
    languages: { type: [String], default: [] },
    projects: { type: [mongoose.Schema.Types.Mixed], default: [] },

    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },

    /** Role suggestions ranked by fit. */
    suggestedRoles: {
      type: [
        {
          _id: false,
          title: String,
          matchPercent: Number,
          demand: { type: String, default: 'Medium' },
          reason: String,
          topSkills: [String],
        },
      ],
      default: [],
    },

    engine: { type: String, default: 'local' },
    processingMs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

analysisSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Analysis', analysisSchema);
