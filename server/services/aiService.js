const axios = require('axios');
const env = require('../config/env');
const { analyzeLocally, clamp, SCORE_WEIGHTS } = require('./localAnalyzer');
const { matchAgainstJob, extractRequiredSkills } = require('./matcherService');
const { getFieldProfile, detectField, isRegulated, FIELDS } = require('./fieldDetection');

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

const SYSTEM_PROMPT = `You are a senior career adviser and precise CV analysis engine working inside an applicant tracking system.

SCOPE — you serve EVERY profession. Marketing, accounting, medicine, teaching, engineering, law, sales, hospitality, trades, research, HR, logistics and anything else. Software is ONE field among many, never a default.

ADAPTATION — before you evaluate anything, work out which field this candidate is actually in from their job titles, qualifications, credentials and vocabulary. Then judge them ONLY against the standards of that field. A CV is strong or weak relative to its own industry, never against a software template.

ABSOLUTE RULES:
1. NEVER suggest software-specific evidence unless the candidate is genuinely in a technical role. Do not recommend a GitHub link, code repositories, a tech stack, or programming projects to a nurse, teacher, accountant, chef, lawyer or salesperson. If in doubt about the field, do not raise it.
2. NEVER penalise a candidate for lacking a software background.
3. NEVER invent employers, dates, qualifications, licences or credentials. Only report what the text evidences.
4. NEVER recommend a credential that is not real and recognised in the candidate's own country or field.
5. Where a field is regulated (medicine, law, teaching, accountancy, finance), treat registration and mandatory qualifications as essential and flag their absence as a genuine blocker — not a nice-to-have.

JUDGEMENT STANDARDS:
- "skills" means whatever the field calls them: clinical competencies, subject knowledge, techniques, accountancy standards, teaching methodologies, sales skills, culinary and food-safety expertise. Use the field's own vocabulary, not a generic list.
- "missingKeywords" must be terms a recruiter screening THIS field would filter on.
- "strengths" and "weaknesses" must be field-specific and evidence-based, drawn from what is actually written.
- "recommendations" must be things this candidate could act on this week, in their own industry.
- Measure outcomes, not just duties. Every field has numbers: revenue, margins, wait times, attainment, caseload, throughput, conversion, compliance, patient outcomes. Credit quantified results in any unit.
- "demand" reflects real labour-market conditions in that field and region, not software hype.

Be concise and professional. Each strength, weakness and recommendation is one actionable sentence, free of filler and jargon.

You always reply with a single valid JSON object and nothing else.
No markdown fences, no prose, no trailing commentary.`;

/** Human-readable rubric, injected into the prompt so both engines agree. */
const weightLines = Object.entries(SCORE_WEIGHTS)
  .map(([k, v]) => `  "${k}": ${Math.round(v * 100)}%`)
  .join('\n');

/**
 * Describe the detected field for the prompt. Gives the model the same
 * context the deterministic engine used, so the two engines reason about the
 * same industry instead of the model second-guessing a settled decision.
 */
const fieldBrief = (fieldKey, detection, fieldProfile) => {
  const evidence = detection?.evidence?.length
    ? `\n- Signals found in the CV: ${detection.evidence.join('; ')}`
    : '';
  // The short name keeps the prompt readable: "judge against Healthcare
  // standards" rather than "judge against Healthcare, Clinical & Allied
  // Health standards". `label` is the full form, used in the UI.
  const short = fieldProfile.altLabels?.[0] || fieldProfile.label;
  return `CANDIDATE'S FIELD: ${fieldProfile.label} (confidence ${detection?.confidence ?? 0}%)
- Judge every criterion below against ${short} standards, not software standards.
- The evidence recruiters in this field look for: ${fieldProfile.portfolio.hint}.
- Realistic outcomes in this field look like: ${fieldProfile.metrics.join('; ')}.
- Credentials this field recognises: ${fieldProfile.credentials.join('; ')}.${
    isRegulated(fieldKey)
      ? '\n- This is a REGULATED field: registration, licence and mandatory qualifications are gating requirements, not optional extras. Flag them explicitly if missing.'
      : ''
  }${evidence}

CRITICAL: do not recommend software-specific evidence (GitHub, repositories, code, tech stacks) unless this candidate is genuinely in a technical role.`;
};

/**
 * Build the resume analysis prompt.
 *
 * @param {string} resumeText
 * @param {{title: string, description: string}} [targetJob]
 * @param {object} [local] Result of analyzeLocally, used to pass the detected
 *   field into the prompt.
 */
const buildPrompt = (resumeText, targetJob, local = null) => {
  const fieldKey = local?.field || 'general';
  const fieldProfile = getFieldProfile(fieldKey);
  const detection = {
    confidence: local?.fieldConfidence ?? 0,
    evidence: local?.fieldEvidence || [],
  };

  // The caller passes a Job document, not a string, so the title has to be read
  // off the object. Stringifying the document used to put "[object Object]" in
  // front of the model, which then had nothing to aim at.
  const targetTitle =
    typeof targetJob === 'string' ? targetJob : targetJob?.title || 'Unspecified target role';
  const targetDescription = typeof targetJob === 'string' ? '' : targetJob?.description || '';

  const target = targetJob
    ? `TARGET JOB TITLE: ${targetTitle}\nTARGET JOB DESCRIPTION:\n${targetDescription}\n\nScore the CV primarily against this target role.\n`
    : 'No specific target role was given. Infer the most likely target role from the CV itself and score general CV quality within that field.\n';

  return `${fieldBrief(fieldKey, detection, fieldProfile)}

${target}
Analyse the resume below and return JSON with EXACTLY this shape:
{
  "score": 0,
  "scoreBreakdown": { "skills": 0, "experience": 0, "education": 0, "formatting": 0, "keywords": 0 },
  "atsScore": 0,
  "field": "${fieldKey}",
  "profile": { "fullName": "", "email": "", "phone": "", "location": "", "links": [], "summary": "", "yearsOfExperience": 0 },
  "skills": [{ "name": "", "category": "", "level": "Beginner|Intermediate|Advanced|Expert", "mentions": 1 }],
  "matchedKeywords": [""],
  "missingKeywords": [""],
  "experience": [{ "title": "", "company": "", "period": "", "highlights": [""] }],
  "education": [{ "degree": "", "institution": "", "year": "" }],
  "certifications": [""],
  "registrations": [""],
  "affiliations": [""],
  "languages": [""],
  "projects": [{ "name": "", "description": "", "stack": [""] }],
  "strengths": [""],
  "weaknesses": [""],
  "recommendations": [""],
  "suggestedRoles": [{ "title": "", "matchPercent": 0, "demand": "High|Medium|Steady", "reason": "", "topSkills": [""] }]
}

FIELD-SPECIFIC REQUIREMENTS:
- "field" must be "${fieldKey}". If the CV is unmistakably a different profession, use your own detection instead and judge everything against that field consistently.
- "skills" must use ${fieldProfile.label} vocabulary. "category" should be that field's discipline grouping (for example clinical practice, financial reporting, classroom instruction, account management, campaign planning) — never a software taxonomy.
- "registrations" holds professional registrations, licences and memberships (a nursing or medical register, a law society, a teaching registration, an accountancy body). Return [] if none apply to this field.
- "affiliations" holds professional bodies, networks, committees and industry memberships. Return [] if none.
- "projects" holds the candidate's own work in progress. For clinical, teaching and accountancy roles this may legitimately be empty; do NOT manufacture projects to fill it. Populate "stack" with the tools, systems, standards or methods involved, whatever those are in this field.

SCORING RUBRIC — "score" is the weighted sum of "scoreBreakdown" using exactly these weights:
${weightLines}

- "skills": breadth and depth of what THIS field screens for, judged against peers in the same role.
- "experience": relevance, seniority progression, and scope of responsibility in this field.
- "education": relevance of qualifications to this field. In a regulated field, registration matters more than a degree.
- "formatting": structure, scannability, use of metrics, and readability by both a human and an ATS.
- "keywords": presence of the terminology recruiters in this field filter on.

Rules:
- Each "scoreBreakdown" value is an integer 0-100 for its own category, and
  "score" MUST equal the weighted sum above, rounded to the nearest integer.
  Do not invent a different weighting.
- "atsScore" is a separate 0-100 estimate of machine readability by an ATS.
- Only list skills, jobs and qualifications that are actually evidenced in the text. Never invent employers, dates or credentials.
- "missingKeywords" must be real, high-value keywords for THIS field that are absent from the CV, max 12 items.
- Be concise: each strength/weakness/recommendation is one actionable sentence.
- Never give advice you would give a software engineer. If a strength or recommendation would read identically across industries, rewrite it for this field.
- If a field cannot be determined, return an empty array or empty string, never null.

RESUME TEXT:
"""
${resumeText.slice(0, 12000)}
"""`;
};

/**
 * Prompt for scoring a parsed candidate against one job description.
 *
 * Field-aware for the same reason as `buildPrompt`: a match score for a nurse
 * against a nursing post is coverage of clinical competencies, not keyword
 * overlap on frameworks.
 */
const buildMatchPrompt = (candidateProfile, jobDescription, fieldKey = null) => {
  const key =
    fieldKey ||
    candidateProfile?.field ||
    detectField(String(jobDescription || '')).field ||
    'general';
  const fieldProfile = getFieldProfile(key);

  return `CANDIDATE'S FIELD: ${fieldProfile.label}
Judge fit against ${fieldProfile.label} standards. Terminology, evidence and gaps must come from this field, not from software hiring conventions.

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
- "skills" means what this field calls skills: clinical competencies, accountancy standards, teaching methodologies, sales technique, systems and tools. Use the job description's own vocabulary.
- Where the role is regulated, treat missing registration or licence as a significant gap and reflect it in "missingSkills" and "seniorityFit".
- "extraSkills" are strong candidate skills the job does not mention.
- Each recommendation is one actionable sentence a candidate could act on today, in this industry.
- "summary" is two sentences a recruiter would actually say out loud, in plain professional English.
- If a field cannot be determined, return an empty array or empty string, never null.

CANDIDATE PROFILE:
"""
${JSON.stringify(candidateProfile).slice(0, 6000)}
"""

JOB DESCRIPTION:
"""
${String(jobDescription).slice(0, 6000)}
"""`;
};

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
  const field = FIELDS[ai.field] ? ai.field : fallback.field;

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
    // The model may disagree with the deterministic detector. When it names a
    // different field, trust it — it read the whole document — but only if it
    // named a field we actually know. The label, confidence and evidence are
    // always re-derived from the field we actually settled on, so the response
    // can never describe a field it was not analysed against.
    field,
    fieldLabel: getFieldProfile(field).label,
    fieldConfidence: fallback.fieldConfidence ?? 0,
    fieldEvidence: fallback.fieldEvidence || [],
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
    // Professional registrations and memberships. These are hard evidence in
    // regulated fields (medicine, law, teaching, accountancy) where the
    // omission of them is a genuine blocker rather than a nice-to-have.
    registrations: arr(ai.registrations, 10).map((r) => str(r, 140)).filter(Boolean),
    affiliations: arr(ai.affiliations, 10).map((a) => str(a, 140)).filter(Boolean),
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
  // The local engine runs first and does the field detection, so its result is
  // what tells the AI prompt which industry to judge against.
  const local = analyzeLocally(resumeText, targetJob);
  const provider = env.resolveAiProvider();

  if (provider === 'local') {
    return { ...local, processingMs: Date.now() - started };
  }

  try {
    const raw = await callProvider(provider, buildPrompt(resumeText, targetJob, local));
    const parsed = parseLooseJson(raw);
    const clean = sanitise(parsed, local);

    // If the model named a different field than the deterministic engine, the
    // confidence and evidence no longer describe the analysis, so re-detect
    // against the same text rather than shipping a healthcare confidence for a
    // marketing CV.
    if (clean.field !== local.field) {
      console.warn(
        `[ai] field disagreement: local="${local.field}" model="${clean.field}", using model`
      );
      const recheck = detectField(resumeText, {
        skills: local.skills,
        experience: local.experience,
      });
      clean.fieldLabel = getFieldProfile(clean.field).label;
      clean.fieldConfidence = recheck.field === clean.field ? recheck.confidence : local.fieldConfidence;
      clean.fieldEvidence = recheck.field === clean.field ? recheck.evidence : local.fieldEvidence;
    }

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
    // Prefer the field the candidate's own analysis detected, so a nurse is
    // matched on clinical terms even when the job ad is vague.
    const raw = await callProvider(
      provider,
      buildMatchPrompt(candidateProfile, description, candidateProfile?.field || null)
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
  buildPrompt,
  buildMatchPrompt,
  SYSTEM_PROMPT,
};
