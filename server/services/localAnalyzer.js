const {
  SKILL_INDEX,
  ALIASES,
  ROLE_PROFILES,
  ATS_KEYWORDS,
  SECTION_PATTERNS,
  STRONG_VERB,
  QUANTIFIED,
} = require('./skillTaxonomy');

/** Clamp helper so scores can never leave 0-100. */
const clamp = (n, min = 0, max = 100) => Math.min(max, Math.max(min, n));

/**
 * Category weights for the overall CV score. Exported so the AI prompt quotes
 * exactly the same numbers the local engine computes with — otherwise the
 * "AI" score and the fallback score would be graded on different rubrics and
 * would drift apart whenever one engine was used.
 */
const SCORE_WEIGHTS = {
  skills: 0.28,
  experience: 0.27,
  education: 0.13,
  formatting: 0.19,
  keywords: 0.13,
};

/**
 * Infer a skill level from how the candidate talks about it.
 * Mentions plus surrounding seniority words beat a bare keyword list.
 *
 * @param {string} name canonical skill name
 * @param {number} mentions occurrences in the resume
 * @param {string} context the full resume text
 */
const inferLevel = (name, mentions, context) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const skillRegion = new RegExp(
    `.{0,120}\\b${escaped}\\b.{0,120}`,
    'gi'
  );
  const regions = context.match(skillRegion) || [];
  const blob = regions.join(' ');

  const senior = /\b(lead|principal|architect|head of|senior|sr\.?|director|mentored|owned|designed|strateg)\b/i;
  const mid = /\b(built|developed|implemented|worked on|contributed|used|managed)\b/i;

  if (senior.test(blob) && mentions >= 3) return 'Expert';
  if (senior.test(blob) || mentions >= 5) return 'Advanced';
  if (mid.test(blob) && mentions >= 2) return 'Intermediate';
  return 'Beginner';
};

/**
 * Extract the contact header block that sits above the first section heading.
 */
const extractProfile = (text) => {
  const header = text.slice(0, 800);
  const email = /[\w.+-]+@[\w-]+\.[\w.-]+/.exec(header)?.[0] || '';
  const phone =
    /(\+?\d{1,3}[\s.-]?)?(\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/.exec(header)?.[0]?.trim() || '';
  const links = [
    ...new Set(
      (header.match(/(?:https?:\/\/|www\.)[^\s,;)]+/gi) || []).map((l) =>
        l.replace(/[.,;]$/, '')
      )
    ),
  ];
  // LinkedIn / GitHub handles are often written without a protocol.
  const handles = header.match(
    /(?:linkedin\.com\/in|github\.com)\/[A-Za-z0-9_-]+/gi
  ) || [];
  links.push(...handles);

  // First line that is not an email/phone/URL is almost always the name.
  const firstLine = text
    .split('\n')
    .map((l) => l.trim())
    .find(
      (l) =>
        l.length > 2 &&
        l.length < 60 &&
        !/[@\d]/.test(l) &&
        !/https?:|www\.|linkedin|github/i.test(l) &&
        /^[A-Za-z .'-]+$/.test(l)
    );

  const location =
    /([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*,\s*[A-Z]{2,})/.exec(header)?.[1] || '';

  // Prefer an explicit Summary section, else the first prose paragraph.
  const summaryMatch = SECTION_PATTERNS.summary.exec(text);
  let summary = '';
  if (summaryMatch) {
    const after = text.slice(summaryMatch.index + summaryMatch[0].length);
    summary = after.split('\n').slice(0, 4).join(' ').trim().slice(0, 400);
  } else {
    const prose = text
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.split(/\s+/).length > 18 && !/[@\d]/.test(l));
    summary = (prose || '').slice(0, 400);
  }

  return {
    fullName: (firstLine || '').slice(0, 60),
    email,
    phone,
    location,
    links: [...new Set(links)].slice(0, 6),
    summary,
  };
};

/**
 * Find every skill the taxonomy knows about, counting occurrences.
 * @returns {Array<{name, category, level, mentions}>}
 */
const extractSkills = (text) => {
  const lower = text.toLowerCase();
  const found = new Map();

  const record = (canonical, matchedLength) => {
    const meta = SKILL_INDEX.get(canonical.toLowerCase());
    if (!meta) return;
    // Word-boundary count of the canonical name plus any alias surface form.
    const variants = new Set([meta.name.toLowerCase()]);
    for (const [alias, target] of Object.entries(ALIASES)) {
      if (target === meta.name) variants.add(alias);
    }

    let mentions = 0;
    for (const v of variants) {
      const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const hits = lower.match(new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'g'));
      if (hits) mentions += hits.length;
    }

    if (mentions === 0) return;
    // A 2-char alias like "ai"/"ml" is noisy; require corroboration.
    if (matchedLength <= 2 && mentions < 2) return;

    const existing = found.get(meta.name);
    if (existing) existing.mentions += mentions;
    else found.set(meta.name, { ...meta, mentions });
  };

  // Longest aliases first so "react native" wins over "react".
  const aliasKeys = Object.keys(ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of aliasKeys) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'g');
    if (re.test(lower)) record(ALIASES[alias], alias.length);
    re.lastIndex = 0;
  }

  // Then canonical names.
  for (const canonical of SKILL_INDEX.keys()) {
    if (canonical.length < 2) continue;
    const escaped = canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![a-z0-9+])${escaped}(?![a-z0-9+])`, 'g');
    if (re.test(lower)) record(canonical, canonical.length);
    re.lastIndex = 0;
  }

  return [...found.values()]
    .map((s) => ({
      name: s.name,
      category: s.category,
      level: inferLevel(s.name, s.mentions, text),
      mentions: s.mentions,
    }))
    .sort((a, b) => b.mentions - a.mentions || b.weight - a.weight);
};

/** Total years of experience from date ranges like "2019 - Present". */
const extractYearsOfExperience = (text) => {
  const yearRanges = [];
  const rangeRe =
    /\b(19[89]\d|20[0-2]\d)\s*(?:-|–|—|to|until)\s*(present|current|now|19[89]\d|20[0-2]\d)\b/gi;
  let m;
  while ((m = rangeRe.exec(text)) !== null) {
    const start = Number(m[1]);
    const endToken = m[2].toLowerCase();
    const nowYear = new Date().getFullYear();
    const end = /^\d{4}$/.test(endToken) ? Number(endToken) : nowYear;
    if (end >= start && end - start <= 45) yearRanges.push([start, end]);
  }

  if (!yearRanges.length) {
    // Fall back to the highest year mentioned in a plausible range.
    const years = [...text.matchAll(/\b(19[89]\d|20[0-2]\d)\b/g)].map((x) => Number(x[1]));
    if (!years.length) return 0;
    const oldest = Math.min(...years);
    return clamp(new Date().getFullYear() - oldest, 0, 45);
  }

  // Merge overlapping ranges so concurrent roles are not double counted.
  yearRanges.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [curStart, curEnd] = yearRanges[0];
  for (let i = 1; i < yearRanges.length; i += 1) {
    const [s, e] = yearRanges[i];
    if (s <= curEnd) curEnd = Math.max(curEnd, e);
    else {
      total += curEnd - curStart;
      [curStart, curEnd] = [s, e];
    }
  }
  total += curEnd - curStart;
  return clamp(total, 0, 45);
};

/** Section presence drives the structure/formatting part of the score. */
const detectSections = (text) => {
  const found = {};
  for (const [name, pattern] of Object.entries(SECTION_PATTERNS)) {
    found[name] = pattern.test(text);
  }
  return found;
};

/**
 * Locate every known section heading once, so a section's body can be bounded
 * by the *next* heading. Without this, the Experience section swallows
 * Education and Certifications.
 */
const findSectionHeadings = (text) => {
  const headings = [];
  for (const pattern of Object.values(SECTION_PATTERNS)) {
    // Patterns are /i but not /g, so a fresh exec per call is stateless.
    const re = new RegExp(pattern.source, 'im');
    const m = re.exec(text);
    if (m) headings.push({ index: m.index, length: m[0].length });
  }
  return headings.sort((a, b) => a.index - b.index);
};

/**
 * Return the text belonging to one section, stopping at the next heading.
 */
const sectionBody = (text, headingPattern) => {
  const re = new RegExp(headingPattern.source, 'im');
  const m = re.exec(text);
  if (!m) return '';

  const start = m.index + m[0].length;
  const next = findSectionHeadings(text).find(
    (h) => h.index > m.index && h.index >= start
  );
  return text.slice(start, next ? next.index : undefined);
};

/**
 * Split a section body into entries that look like roles or degrees.
 * Entries are usually separated by a blank line or a date range.
 */
const splitEntries = (body, max = 8) =>
  body
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 30 && b.length < 700)
    .slice(0, max);

const hasStrongVerb = (line) => {
  // STRONG_VERB is /g — a shared global regex would carry lastIndex between
  // calls and return alternating results. Build a fresh stateless one.
  return new RegExp(STRONG_VERB.source, 'i').test(line);
};

const extractExperience = (text) =>
  splitEntries(sectionBody(text, SECTION_PATTERNS.experience), 8).map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const dateLine = lines.find((l) => /\d{4}/.test(l) && l.length < 60) || '';
    const dateMatch =
      /((?:19|20)\d{2})\s*(?:-|–|—|to)\s*(present|current|now|(?:19|20)\d{2})/i.exec(dateLine);
    return {
      title: lines.find((l) => !/\d{4}/.test(l)) || lines[0]?.slice(0, 120) || '',
      company: lines.find((l) => !/\d{4}/.test(l) && l !== dateLine) || '',
      period: dateMatch ? dateMatch[0] : dateLine,
      highlights: block
        .split('\n')
        .filter((l) => hasStrongVerb(l) || QUANTIFIED.test(l))
        .slice(0, 3)
        .map((l) => l.slice(0, 220)),
    };
  });

const extractEducation = (text) =>
  splitEntries(sectionBody(text, SECTION_PATTERNS.education), 5).map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const degree = lines.find((l) =>
      /bachelor|master|ph\.?d|doctorate|diploma|b\.?sc|m\.?sc|b\.?a|m\.?a|associate/i.test(l)
    );
    return {
      degree: (degree || lines[0] || '').slice(0, 140),
      institution: lines.find((l) => /university|college|institute|school|academy/i.test(l)) || '',
      year: (block.match(/\b(?:19|20)\d{2}\b/) || [])[0] || '',
    };
  });

const extractProjects = (text) =>
  splitEntries(sectionBody(text, SECTION_PATTERNS.projects), 6).map((block) => ({
    name: block.split('\n')[0]?.slice(0, 120) || '',
    description: block.split('\n').slice(1).join(' ').slice(0, 300),
    stack: block
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 28 && SKILL_INDEX.has(s.toLowerCase()))
      .slice(0, 8),
  }));

const extractList = (text, headingPattern, limit = 10) => {
  const body = sectionBody(text, headingPattern);
  if (!body) return [];
  return [
    ...new Set(
      body
        .slice(0, 900)
        .split(/[\n,;•·|]/)
        .map((s) => s.replace(/^[\s\-*•·\d.)]+/, '').trim())
        .filter((s) => s.length > 2 && s.length < 70)
    ),
  ].slice(0, limit);
};

/**
 * Detect which role families the candidate has actually *held*, based on the
 * job titles in their experience entries. This is stronger evidence than skill
 * keyword coverage: listing Docker and AWS as a backend engineer should not
 * outrank "Backend Engineer" when their actual job title says so.
 */
const detectHeldRoles = (experience, fullText) => {
  const titles = [
    ...experience.map((e) => e.title || ''),
    ...experience.map((e) => e.company || ''),
  ].join(' ').toLowerCase();
  const blob = `${titles} ${fullText.toLowerCase().slice(0, 400)}`;

  const held = new Set();
  for (const role of Object.keys(ROLE_PROFILES)) {
    const head = role.split(' / ')[0].toLowerCase(); // "QA / Test Engineer" -> "qa"
    const words = head.split(/\s+/).filter((w) => w.length > 2);
    if (!words.length) continue;
    if (words.every((w) => new RegExp(`(?<![a-z])${w}`).test(blob))) {
      held.add(role);
    }
  }
  return held;
};

/**
 * Rank job titles by how well the candidate's skills cover each role profile,
 * boosted when the role matches a title they have actually held.
 */
const suggestRoles = (skills, heldRoles = new Set()) => {
  const skillNames = new Set(skills.map((s) => s.name.toLowerCase()));
  const weighted = new Map(
    skills.map((s) => [s.name.toLowerCase(), s.mentions])
  );

  return Object.entries(ROLE_PROFILES)
    .map(([title, required]) => {
      const hits = required.filter((r) => skillNames.has(r.toLowerCase()));
      // Coverage dominates; mention depth breaks ties.
      const coverage = hits.length / required.length;
      const depth =
        hits.reduce((sum, h) => sum + Math.min(weighted.get(h.toLowerCase()) || 0, 8), 0) /
        Math.max(hits.length, 1);

      // A role already held should outrank a marginally better keyword match,
      // but must still clear a reasonable skill bar to be suggested at all.
      const heldBonus = heldRoles.has(title) ? 22 : 0;
      const score = clamp(coverage * 82 + Math.min(depth, 6) * 3 + heldBonus);

      return { title, hits, coverage, score, held: heldRoles.has(title) };
    })
    .filter((r) => r.hits.length >= 2 && r.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((r) => ({
      title: r.title,
      matchPercent: Math.round(r.score),
      demand:
        ['AI Engineer', 'Machine Learning Engineer', 'Full Stack Developer', 'DevOps Engineer'].includes(
          r.title
        )
          ? 'High'
          : r.score > 70
            ? 'Medium'
            : 'Steady',
      reason: r.held
        ? `You already hold this title, and your CV evidences ${r.hits.slice(0, 3).join(', ')}.`
        : `Your CV already evidences ${r.hits
            .slice(0, 3)
            .join(', ')}${r.hits.length > 3 ? ` and ${r.hits.length - 3} more` : ''}.`,
      topSkills: r.hits.slice(0, 5),
    }));
};

/**
 * Keywords worth adding. Scoped to the single best-fit role rather than the
 * union of the top three — unioning pulls in Django, Flask and Java for a
 * React developer, which is noise rather than advice.
 */
const findMissingKeywords = (skills, roles) => {
  const present = new Set(skills.map((s) => s.name.toLowerCase()));
  const wanted = new Set();

  const topRole = roles[0];
  if (topRole) {
    for (const skill of ROLE_PROFILES[topRole.title] || []) {
      if (!present.has(skill.toLowerCase())) wanted.add(skill);
    }
  }
  // Transferable skills that recruiters filter on regardless of role.
  for (const kw of ATS_KEYWORDS) {
    if (!present.has(kw.toLowerCase())) wanted.add(kw);
  }

  return [...wanted].slice(0, 12);
};

/**
 * Score a CV out of 100 with an explainable breakdown.
 * Weighted so that a well-structured CV with a decent skill breadth and
 * quantified achievements lands in the 70-85 band, which is what recruiters
 * actually see in practice.
 */
const scoreResume = (text, skills, sections, years, roleTitles) => {
  const skillScore = clamp((skills.length / 18) * 100, 0, 100);

  // A CV is usually 1-3 pages; ~2000 characters is a reasonable single page.
  const expScore = clamp(
    35 + years * 9 + (sections.experience ? 25 : 0) + (sections.projects ? 10 : 0),
    0,
    100
  );

  const eduScore = clamp(
    (sections.education ? 55 : 0) +
      (sections.certifications ? 25 : 0) +
      (/ph\.?d|doctorate|master/i.test(text) ? 20 : 0),
    0,
    100
  );

  // Quantified, action-oriented bullets are the single biggest ATS signal.
  const quantifiedCount = (text.match(new RegExp(QUANTIFIED, 'gi')) || []).length;
  const verbCount = (text.match(STRONG_VERB) || []).length;
  const formatScore = clamp(
    quantifiedCount * 6 + verbCount * 2.5 + (sections.summary ? 20 : 0),
    0,
    100
  );

  // Are the role-defining keywords present at all?
  const present = new Set(skills.map((s) => s.name.toLowerCase()));
  const targetKeywords = new Set(
    (ROLE_PROFILES[roleTitles[0]?.title] || []).map((k) => k.toLowerCase())
  );
  const covered = [...targetKeywords].filter((k) => present.has(k)).length;
  const keywordScore = targetKeywords.size
    ? clamp((covered / targetKeywords.size) * 100, 0, 100)
    : 50;

  const breakdown = {
    skills: Math.round(skillScore),
    experience: Math.round(expScore),
    education: Math.round(eduScore),
    formatting: Math.round(formatScore),
    keywords: Math.round(keywordScore),
  };

  const score = Math.round(
    breakdown.skills * SCORE_WEIGHTS.skills +
      breakdown.experience * SCORE_WEIGHTS.experience +
      breakdown.education * SCORE_WEIGHTS.education +
      breakdown.formatting * SCORE_WEIGHTS.formatting +
      breakdown.keywords * SCORE_WEIGHTS.keywords
  );

  return { score: clamp(score), breakdown };
};

/**
 * ATS parsers reward a single column, standard headings, and a parseable
 * contact block. This approximates that without a real layout engine.
 */
const atsScore = (text, profile, sections) => {
  let score = 40;
  if (profile.email) score += 12;
  if (profile.phone) score += 8;
  if (profile.fullName) score += 8;
  if (profile.links.length) score += 6;
  if (sections.experience) score += 8;
  if (sections.education) score += 6;
  if (sections.skills) score += 6;
  // Very dense text suggests columns, tables or graphics that break parsing.
  if (text.length > 9000) score -= 8;
  if (!/[@]/.test(text)) score -= 15;
  return Math.round(clamp(score));
};

const buildStrengths = (skills, sections, years, text) => {
  const out = [];
  const byCat = skills.reduce((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1;
    return acc;
  }, {});
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

  if (topCat && topCat[1] >= 3) {
    out.push(`Strong ${topCat[0].toLowerCase()} coverage with ${topCat[1]} recognised technologies.`);
  }
  if (years >= 3) {
    out.push(`${years}+ years of demonstrable industry experience.`);
  }
  if (sections.experience) {
    out.push('Experience section is clearly structured and easy for recruiters to scan.');
  }
  const quantified = (text.match(new RegExp(QUANTIFIED, 'gi')) || []).length;
  if (quantified >= 3) {
    out.push(`Quantified impact in ${quantified} places (metrics strongly influence shortlisting).`);
  }
  if (sections.projects) {
    out.push('Projects section gives evidence of applied, hands-on ability.');
  }
  const advanced = skills.filter((s) => s.level === 'Expert' || s.level === 'Advanced');
  if (advanced.length >= 3) {
    out.push(`Demonstrated depth in ${advanced.slice(0, 3).map((s) => s.name).join(', ')}.`);
  }
  if (sections.education) out.push('Education is clearly stated and easy for ATS to parse.');
  return out.slice(0, 6);
};

const buildWeaknesses = (skills, sections, text, profile) => {
  const out = [];
  if (skills.length < 6) {
    out.push('Too few recognisable technical keywords — an ATS may not classify your CV correctly.');
  }
  if (!sections.experience) {
    out.push('No clearly labelled Experience section, which significantly hurts ATS parsing.');
  }
  if (!sections.skills) {
    out.push('No dedicated Skills section. Add one so keyword matching works reliably.');
  }
  if (!sections.summary) {
    out.push('No professional summary to orient a recruiter in the first 3 seconds.');
  }
  if (!profile.email) {
    out.push('No email address detected in the header block.');
  }
  if (!profile.phone) {
    out.push('No phone number detected — many recruiters still expect one.');
  }
  const quantified = (text.match(new RegExp(QUANTIFIED, 'gi')) || []).length;
  if (quantified < 2) {
    out.push('Very few measurable results. Add numbers to your bullet points.');
  }
  if (text.length > 9000) {
    out.push('The CV is very dense; long documents are often skipped and may parse badly.');
  }
  return out.slice(0, 6);
};
const buildRecommendations = (missing, weaknesses, skills, sections) => {
  const out = [];
  if (missing.length) {
    out.push(
      `Weave these high-value keywords into your CV where truthful: ${missing
        .slice(0, 5)
        .join(', ')}.`
    );
  }
  if (!sections.summary) {
    out.push('Add a 3-line professional summary at the top stating your role, years of experience and strongest stack.');
  }
  if (!sections.projects) {
    out.push('Add a Projects section with links to GitHub or a live demo — it is the fastest proof of skill for junior candidates.');
  }
  const quantified = weaknesses.find((w) => /measurable results/i.test(w));
  if (quantified) {
    out.push('Rewrite at least three bullets in the form "Action + Result + Metric", e.g. "Cut API latency 40% by adding Redis caching".');
  }
  if (skills.length > 22) {
    out.push('You list a lot of technologies. Prioritise the 12-15 most relevant to your target role to avoid diluting your profile.');
  }
  out.push('Save an ATS-friendly PDF (single column, no tables, no text boxes) and keep a .docx for portals that reformat files.');
  return out.slice(0, 6);
};

/**
 * Full deterministic analysis. This is the offline engine used when no AI
 * provider key is configured, and the fallback when a provider call fails.
 *
 * @param {string} text Extracted resume text.
 * @returns {object} An analysis payload matching the Analysis schema.
 */
const analyzeLocally = (text) => {
  const profile = extractProfile(text);
  const skills = extractSkills(text);
  const sections = detectSections(text);
  const yearsOfExperience = extractYearsOfExperience(text);
  const experience = extractExperience(text);
  const education = extractEducation(text);

  const heldRoles = detectHeldRoles(experience, text);
  const suggestedRoles = suggestRoles(skills, heldRoles);
  const missingKeywords = findMissingKeywords(skills, suggestedRoles);
  const matchedKeywords = suggestedRoles[0]?.topSkills || skills.slice(0, 10).map((s) => s.name);
  const { score, breakdown } = scoreResume(text, skills, sections, yearsOfExperience, suggestedRoles);
  const ats = atsScore(text, profile, sections);

  const weaknesses = buildWeaknesses(skills, sections, text, profile);
  // A strong CV can legitimately trip none of the structural checks, but the
  // dashboard should always offer something actionable. Keyword gaps are the
  // honest fallback because they are always computed.
  if (!weaknesses.length && missingKeywords.length) {
    weaknesses.push(
      `No structural issues found, but your CV does not mention ${missingKeywords
        .slice(0, 3)
        .join(', ')} — keywords recruiters filter on for your target role.`
    );
  }

  return {
    score,
    scoreBreakdown: breakdown,
    atsScore: ats,
    profile: { ...profile, yearsOfExperience },
    skills,
    matchedKeywords,
    missingKeywords,
    experience,
    education,
    certifications: extractList(text, SECTION_PATTERNS.certifications, 8),
    languages: extractList(text, SECTION_PATTERNS.languages, 6),
    projects: extractProjects(text),
    strengths: buildStrengths(skills, sections, yearsOfExperience, text),
    weaknesses,
    recommendations: buildRecommendations(missingKeywords, weaknesses, skills, sections),
    suggestedRoles,
    engine: 'local',
  };
};

module.exports = {
  analyzeLocally,
  extractSkills,
  extractProfile,
  extractYearsOfExperience,
  detectSections,
  suggestRoles,
  findMissingKeywords,
  scoreResume,
  clamp,
  SCORE_WEIGHTS,
};
