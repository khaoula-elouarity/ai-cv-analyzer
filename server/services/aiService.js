const axios = require('axios');
const env = require('../config/env');
const { analyzeLocally, clamp, SCORE_WEIGHTS } = require('./localAnalyzer');
const { matchAgainstJob, extractRequiredSkills } = require('./matcherService');

/** OpenAI-compatible providers. Groq and xAI both speak this dialect. */
const PROVIDERS = {
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    model: () => env.groqModel,
    key: () => env.groqApiKey,
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: () => env.openaiModel,
    key: () => env.openaiApiKey,
  },
  xai: {
    baseUrl: 'https://api.x.ai/v1',
    model: () => env.xaiModel,
    key: () => env.xaiApiKey,
  },
};

const SYSTEM_PROMPT = `You are a precise CV analysis engine used by an applicant tracking system.
You always reply with a single valid JSON object and nothing else.
No markdown fences, no prose, no trailing commentary.`;

/** Human-readable rubric, injected into the prompt so both engines agree. */
const weightLines = Object.entries(SCORE_WEIGHTS)
  .map(([k, v]) => `  "${k}": ${Math.round(v * 100)}%`)
  .join('\n');

const buildPrompt = (resumeText, targetJob) => {
  const target = targetJob
    ? `TARGET JOB TITLE: ${targetJob}\nTARGET JOB DESCRIPTION:\n${targetJob.description}\n\nScore the CV primarily against this target role.\n`
    : 'No specific target role was given. Infer the most likely target role from the CV itself and score general CV quality.\n';

  return `${target}
Analyse the resume below and return JSON with EXACTLY this shape:
{
  "score": 0,
  "scoreBreakdown": { "skills": 0, "experience": 0, "education": 0, "formatting": 0, "keywords": 0 },
  "atsScore": 0,
  "profile": { "fullName": "", "email": "", "phone": "", "location": "", "links": [], "summary": "", "yearsOfExperience": 0 },
  "skills": [{ "name": "", "category": "", "level": "Beginner|Intermediate|Advanced|Expert", "mentions": 1 }],
  "matchedKeywords": [""],
  "missingKeywords": [""],
  "experience": [{ "title": "", "company": "", "period": "", "highlights": [""] }],
  "education": [{ "degree": "", "institution": "", "year": "" }],
  "certifications": [""],
  "languages": [""],
  "projects": [{ "name": "", "description": "", "stack": [""] }],
  "strengths": [""],
  "weaknesses": [""],
  "recommendations": [""],
  "suggestedRoles": [{ "title": "", "matchPercent": 0, "demand": "High|Medium|Steady", "reason": "", "topSkills": [""] }]
}

Scoring rubric — "score" is the weighted sum of "scoreBreakdown" using exactly these weights:
${weightLines}

Rules:
- Each "scoreBreakdown" value is an integer 0-100 for its own category, and
  "score" MUST equal the weighted sum above, rounded to the nearest integer.
  Do not invent a different weighting.
- "atsScore" is a separate 0-100 estimate of machine readability by an ATS.
- Only list skills, jobs and qualifications that are actually evidenced in the text. Never invent employers, dates or credentials.
- "missingKeywords" must be real, high-value ATS keywords absent from the CV, max 12 items.
- Be concise: each strength/weakness/recommendation is one actionable sentence.
- If a field cannot be determined, return an empty array or empty string, never null.

RESUME TEXT:
"""
${resumeText.slice(0, 12000)}
"""`;
};

/** Prompt for scoring a parsed candidate against one job description. */
const buildMatchPrompt = (candidateProfile, jobDescription) => `
Compare the candidate profile below against the job description and return JSON with EXACTLY this shape:
{
  "score": 0,
  "matchedSkills": [""],
  "missingSkills": [""],
  "extraSkills": [""],
  "seniorityFit": "Below|Align|Overage",
  "recommendations": [""],
  "summary": ""
}

Rules:
- "score" is an integer 0-100: 70% required-skill coverage, 20% seniority and
  years-of-experience fit, 10% overall profile strength. Round to the nearest
  integer.
- "matchedSkills" are skills the candidate demonstrably has that the job asks
  for. "missingSkills" are skills the job asks for that the candidate lacks.
  Both must be drawn from the two documents below — never invent a skill that
  appears in neither.
- "extraSkills" are strong candidate skills the job does not mention.
- Each recommendation is one actionable sentence a candidate could act on today.
- If a field cannot be determined, return an empty array or empty string, never null.

CANDIDATE PROFILE:
"""
${JSON.stringify(candidateProfile).slice(0, 6000)}
"""

JOB DESCRIPTION:
"""
${String(jobDescription).slice(0, 6000)}
"""`;

/**
 * Extract the first balanced JSON object from a model response. Models
 * occasionally wrap JSON in prose or fences despite instructions.
 */
const parseLooseJson = (raw) => {
  const text = String(raw || '').trim();
  const direct = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(direct);
  } catch {
    /* fall through to brace matching */
  }
  const start = direct.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in model response');
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < direct.length; i += 1) {
    const ch = direct[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(direct.slice(start, i + 1));
    }
  }
  throw new Error('Unbalanced JSON in model response');
};

/** Normalise AI output so it always satisfies the Mongoose schema. */
const sanitise = (ai, fallback) => {
  const str = (v, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const arr = (v, max = 20) => (Array.isArray(v) ? v : []).filter(Boolean).slice(0, max);
  const num = (v, dflt = 0) => (Number.isFinite(Number(v)) ? Number(v) : dflt);
  const VALID_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

  return {
    score: Math.round(clamp(num(ai.score, fallback.score))),
    scoreBreakdown: {
      skills: Math.round(clamp(num(ai.scoreBreakdown?.skills, fallback.scoreBreakdown.skills))),
      experience: Math.round(clamp(num(ai.scoreBreakdown?.experience, fallback.scoreBreakdown.experience))),
      education: Math.round(clamp(num(ai.scoreBreakdown?.education, fallback.scoreBreakdown.education))),
      formatting: Math.round(clamp(num(ai.scoreBreakdown?.formatting, fallback.scoreBreakdown.formatting))),
      keywords: Math.round(clamp(num(ai.scoreBreakdown?.keywords, fallback.scoreBreakdown.keywords))),
    },
    atsScore: Math.round(clamp(num(ai.atsScore, fallback.atsScore))),
    profile: {
      fullName: str(ai.profile?.fullName, 60) || fallback.profile.fullName,
      email: str(ai.profile?.email, 120) || fallback.profile.email,
      phone: str(ai.profile?.phone, 40) || fallback.profile.phone,
      location: str(ai.profile?.location, 80) || fallback.profile.location,
      links: arr(ai.profile?.links, 6).map((l) => str(l, 200)).filter(Boolean),
      summary: str(ai.profile?.summary, 500) || fallback.profile.summary,
      yearsOfExperience: Math.round(
        clamp(num(ai.profile?.yearsOfExperience, fallback.profile.yearsOfExperience), 0, 50)
      ),
    },
    skills: arr(ai.skills, 40)
      .map((s) => ({
        name: str(s?.name, 60),
        category: str(s?.category, 40) || 'Other',
        level: VALID_LEVELS.includes(s?.level) ? s.level : 'Intermediate',
        mentions: Math.max(1, Math.round(num(s?.mentions, 1))),
      }))
      .filter((s) => s.name),
    matchedKeywords: arr(ai.matchedKeywords, 25).map((k) => str(k, 60)).filter(Boolean),
    missingKeywords: arr(ai.missingKeywords, 15).map((k) => str(k, 60)).filter(Boolean),
    experience: arr(ai.experience, 12).map((e) => ({
      title: str(e?.title, 120),
      company: str(e?.company, 120),
      period: str(e?.period, 60),
      highlights: arr(e?.highlights, 4).map((h) => str(h, 220)),
    })),
    education: arr(ai.education, 6).map((e) => ({
      degree: str(e?.degree, 140),
      institution: str(e?.institution, 140),
      year: str(e?.year, 10),
    })),
    certifications: arr(ai.certifications, 12).map((c) => str(c, 120)).filter(Boolean),
    languages: arr(ai.languages, 8).map((l) => str(l, 60)).filter(Boolean),
    projects: arr(ai.projects, 8).map((p) => ({
      name: str(p?.name, 120),
      description: str(p?.description, 300),
      stack: arr(p?.stack, 10).map((s) => str(s, 40)).filter(Boolean),
    })),
    strengths: arr(ai.strengths, 8).map((s) => str(s, 300)).filter(Boolean),
    weaknesses: arr(ai.weaknesses, 8).map((s) => str(s, 300)).filter(Boolean),
    recommendations: arr(ai.recommendations, 8).map((s) => str(s, 400)).filter(Boolean),
    suggestedRoles: arr(ai.suggestedRoles, 8)
      .map((r) => ({
        title: str(r?.title, 80),
        matchPercent: Math.round(clamp(num(r?.matchPercent, 50))),
        demand: ['High', 'Medium', 'Steady'].includes(r?.demand) ? r.demand : 'Medium',
        reason: str(r?.reason, 300),
        topSkills: arr(r?.topSkills, 6).map((s) => str(s, 40)).filter(Boolean),
      }))
      .filter((r) => r.title),
  };
};

/** Coerce a model match result into the shape the API returns. */
const sanitiseMatch = (ai, fallback) => {
  const str = (v, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const arr = (v, max = 20) => (Array.isArray(v) ? v : []).filter(Boolean).slice(0, max);

  return {
    score: Math.round(clamp(Number.isFinite(Number(ai.score)) ? Number(ai.score) : fallback.score)),
    matchedKeywords: arr(ai.matchedSkills, 25).map((s) => str(s, 60)).filter(Boolean),
    missingKeywords: arr(ai.missingSkills, 25).map((s) => str(s, 60)).filter(Boolean),
    extraSkills: arr(ai.extraSkills, 15).map((s) => str(s, 60)).filter(Boolean),
    seniorityFit: ['Below', 'Align', 'Overage'].includes(ai.seniorityFit)
      ? ai.seniorityFit
      : fallback.breakdown?.targetSeniority || 'Align',
    recommendations: arr(ai.recommendations, 8).map((r) => str(r, 400)).filter(Boolean),
    summary: str(ai.summary, 500),
    verdict: fallback.verdict,
    breakdown: fallback.breakdown,
  };
};

const callProvider = async (providerName, prompt, signal) => {
  const provider = PROVIDERS[providerName];
  const key = provider.key();
  if (!key) throw new Error(`No API key configured for provider "${providerName}"`);

  const { data } = await axios.post(
    `${provider.baseUrl}/chat/completions`,
    {
      model: provider.model(),
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      timeout: 45_000,
      signal,
    }
  );

  return data?.choices?.[0]?.message?.content;
};

/**
 * Analyse a resume with the configured AI provider, always falling back to
 * the deterministic local engine so the endpoint never hard-fails.
 *
 * The local result is computed first and used as both the fallback and the
 * sanitiser's default for any field the model omits or hallucinates away.
 *
 * @param {string} resumeText
 * @param {{title: string, description: string}} [targetJob]
 * @returns {Promise<object>} analysis payload with an `engine` field
 */
const analyzeResume = async (resumeText, targetJob = null) => {
  const started = Date.now();
  const local = analyzeLocally(resumeText);
  const provider = env.resolveAiProvider();

  if (provider === 'local') {
    return { ...local, processingMs: Date.now() - started };
  }

  try {
    const raw = await callProvider(provider, buildPrompt(resumeText, targetJob));
    const parsed = parseLooseJson(raw);
    const clean = sanitise(parsed, local);

    // Guard against a model returning an empty or wildly low-signal result:
    // if it found almost nothing, trust the deterministic engine instead.
    const tooSparse = clean.skills.length < 3 && local.skills.length >= 5;
    if (tooSparse) {
      console.warn('[ai] model returned too few skills, using local engine');
      return { ...local, processingMs: Date.now() - started };
    }

    // Backfill keyword lists so the matcher UI is never empty.
    if (!clean.matchedKeywords.length) clean.matchedKeywords = local.matchedKeywords;
    if (!clean.missingKeywords.length) clean.missingKeywords = local.missingKeywords;
    if (!clean.suggestedRoles.length) clean.suggestedRoles = local.suggestedRoles;

    return { ...clean, engine: provider, processingMs: Date.now() - started };
  } catch (err) {
    const detail = err.response?.data?.error?.message || err.message;
    console.error(`[ai] ${provider} failed, falling back to local engine:`, detail);
    return { ...local, processingMs: Date.now() - started, aiError: detail };
  }
};

/**
 * Compare a candidate profile against a job description.
 *
 * Mirrors `analyzeResume`: the deterministic matcher runs first and is used
 * both as the fallback and as the source of the `verdict`/`breakdown` fields,
 * so the caller always gets a usable score even with no AI provider
 * configured.
 *
 * @param {object} candidateProfile Parsed analysis, or any object with
 *   `skills` / `profile` / `yearsOfExperience`.
 * @param {string} jobDescription
 * @param {{title?: string, requiredSkills?: string[]}} [job] Optional metadata
 *   used by the deterministic fallback.
 * @returns {Promise<object>} match payload with an `engine` field
 */
const matchResumeWithJob = async (candidateProfile, jobDescription, job = {}) => {
  const started = Date.now();
  const description = String(jobDescription || '');

  // The deterministic path needs the skills as canonical names; an analysis
  // document stores them as objects, a bare profile as strings.
  const ownedSkills = (Array.isArray(candidateProfile?.skills) ? candidateProfile.skills : [])
    .map((s) => (typeof s === 'string' ? s : s?.name))
    .filter(Boolean);

  const years =
    candidateProfile?.profile?.yearsOfExperience ??
    candidateProfile?.yearsOfExperience ??
    0;

  const target = {
    title: job.title || 'Target role',
    description,
    requiredSkills:
      job.requiredSkills?.length ? job.requiredSkills : extractRequiredSkills(description),
  };

  const deterministic = matchAgainstJob(
    // matchAgainstJob reads skills from `analysis.skills` when present and only
    // falls back to scanning raw text, so the synthesised object is enough.
    { skills: ownedSkills.map((name) => ({ name })), profile: { yearsOfExperience: years } },
    target,
    { skills: ownedSkills.map((name) => ({ name })), profile: { yearsOfExperience: years } }
  );

  const provider = env.resolveAiProvider();
  const local = {
    ...deterministic,
    extraSkills: [],
    seniorityFit: deterministic.breakdown?.targetSeniority || 'Align',
    recommendations: [],
    summary: '',
  };

  if (provider === 'local') {
    return { ...local, engine: 'local', processingMs: Date.now() - started };
  }

  try {
    const raw = await callProvider(
      provider,
      buildMatchPrompt(candidateProfile, description)
    );
    const clean = sanitiseMatch(parseLooseJson(raw), local);

    // A model that matched nothing while the deterministic engine found hits is
    // not describing this candidate; trust the deterministic result instead.
    if (!clean.matchedKeywords.length && local.matchedKeywords.length >= 3) {
      console.warn('[ai] match model returned no matched skills, using deterministic matcher');
      return { ...local, engine: 'local', processingMs: Date.now() - started };
    }

    return { ...clean, engine: provider, processingMs: Date.now() - started };
  } catch (err) {
    const detail = err.response?.data?.error?.message || err.message;
    console.error(`[ai] ${provider} match failed, using deterministic matcher:`, detail);
    return { ...local, engine: 'local', processingMs: Date.now() - started, aiError: detail };
  }
};

module.exports = {
  analyzeResume,
  analyzeResumeWithAI: analyzeResume,
  matchResumeWithJob,
  parseLooseJson,
  sanitise,
  sanitiseMatch,
};
