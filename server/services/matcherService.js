const { SKILL_INDEX, ALIASES, SKILL_TAXONOMY } = require('./skillTaxonomy');
const { clamp, extractSkills } = require('./localAnalyzer');

/** Flat map of every known alias -> canonical skill name. */
const CANONICAL = (() => {
  const map = new Map();
  for (const [alias, canonical] of Object.entries(ALIASES)) map.set(alias, canonical);
  for (const name of SKILL_INDEX.keys()) map.set(name, name);
  return map;
})();

/** Build a boundary-safe regex for a skill name. */
const skillRegex = (name) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![a-z0-9+#.])${escaped}(?![a-z0-9+#.])`, 'i');
};

const cache = new Map();
const CACHE_MAX = 500;

const cacheGet = (key) => {
  if (!cache.has(key)) return null;
  const hit = cache.get(key);
  cache.delete(key); // refresh LRU position
  cache.set(key, hit);
  return hit;
};

const cacheSet = (key, value) => {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, value);
  return value;
};

/**
 * Skills required by a job description, memoised on title+description because
 * matchAgainstJob is called once per saved job on every match run.
 */
const requiredSkillsFor = (job) => {
  if (job.requiredSkills?.length) return job.requiredSkills;
  const cacheKey = `${job.title}|${job.description}`;
  const hit = cacheGet(cacheKey);
  if (hit) return hit;
  return cacheSet(cacheKey, extractRequiredSkills(job.description));
};

/**
 * Extract the skills a job description asks for.
 * Job descriptions are short, so a single lowercased pass is enough.
 *
 * @param {string} description
 * @returns {string[]} canonical skill names, most frequent first
 */
const extractRequiredSkills = (description) => {
  const text = ` ${String(description).toLowerCase()} `;
  const counts = new Map();

  // Always store the canonical casing from the taxonomy. The SKILL_INDEX keys
  // are lowercased, so passing one directly would emit "node.js" and
  // duplicate the properly-cased "Node.js" coming from the alias pass.
  const record = (name) => {
    const meta = SKILL_INDEX.get(name.toLowerCase());
    if (!meta) return;
    counts.set(meta.name, (counts.get(meta.name) || 0) + 1);
  };

  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (skillRegex(alias).test(text)) record(canonical);
  }
  for (const name of SKILL_INDEX.keys()) {
    if (name.length < 3) continue;
    if (skillRegex(name).test(text)) record(name);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);
};

/**
 * Score a resume against a specific job description.
 *
 * The score blends four weighted signals so the number is explainable rather
 * than an opaque percentage:
 *  - keyword coverage of the job's required skills (50%)
 *  - seniority alignment (20%)
 *  - seniority/specialisation keywords in the JD (20%)
 *  - seniority/years-of-experience alignment (10%)
 *
 * @param {string} resumeText
 * @param {{title: string, description: string, requiredSkills?: string[]}} job
 * @param {{yearsOfExperience?: number, skills?: Array}} analysis
 */
const matchAgainstJob = (resumeText, job, analysis = {}) => {
  const required = requiredSkillsFor(job);

  const resumeSkills = analysis.skills?.length
    ? analysis.skills
    : extractSkills(resumeText);
  const owned = new Map(resumeSkills.map((s) => [s.name.toLowerCase(), s]));

  const matched = [];
  const missing = [];
  for (const skill of required) {
    (owned.has(skill.toLowerCase()) ? matched : missing).push(skill);
  }

  // 1. Keyword coverage, weighted by how much each skill matters.
  const totalWeight = required.reduce(
    (sum, s) => sum + (SKILL_INDEX.get(s.toLowerCase())?.weight || 1),
    0
  );
  const matchedWeight = matched.reduce(
    (sum, s) => sum + (SKILL_INDEX.get(s.toLowerCase())?.weight || 1),
    0
  );
  const coverage = totalWeight ? matchedWeight / totalWeight : 0;

  const jd = ` ${String(job.description).toLowerCase()} `;
  const cv = ` ${String(resumeText).toLowerCase()} `;

  // 2. Seniority alignment. The title is authoritative; the body is only
  //    consulted as a fallback, because bodies routinely mention other levels
  //    ("you will mentor junior engineers" in a Senior posting).
  const SENIORITY = [
    { term: 'principal', rank: 6, min: 9, max: 30, label: 'Principal' },
    { term: 'staff engineer', rank: 5, min: 7, max: 25, label: 'Staff' },
    { term: 'staff', rank: 5, min: 7, max: 25, label: 'Staff' },
    { term: 'lead', rank: 4, min: 6, max: 25, label: 'Lead' },
    { term: 'senior', rank: 3, min: 5, max: 20, label: 'Senior' },
    { term: 'sr.', rank: 3, min: 5, max: 20, label: 'Senior' },
    { term: 'mid level', rank: 2, min: 2, max: 5, label: 'Mid' },
    { term: 'mid-level', rank: 2, min: 2, max: 5, label: 'Mid' },
    { term: 'intermediate', rank: 2, min: 2, max: 5, label: 'Mid' },
    { term: 'associate', rank: 1, min: 0, max: 2, label: 'Junior' },
    { term: 'junior', rank: 1, min: 0, max: 1, label: 'Junior' },
    { term: 'entry level', rank: 1, min: 0, max: 1, label: 'Junior' },
    { term: 'intern', rank: 0, min: 0, max: 0, label: 'Intern' },
  ];

  const titleText = ` ${String(job.title || '').toLowerCase()} `;
  // Highest rank wins, so "Senior Staff Engineer" resolves to Staff.
  const fromTitle = SENIORITY.filter((s) => titleText.includes(s.term)).sort(
    (a, b) => b.rank - a.rank
  )[0];
  const fromBody = SENIORITY.filter((s) => jd.includes(s.term)).sort(
    (a, b) => b.rank - a.rank
  )[0];
  const target = fromTitle || fromBody || { min: 1, max: 20, label: 'Any', rank: 2 };
  const years = analysis.yearsOfExperience ?? analysis.profile?.yearsOfExperience ?? 0;
  const seniorityFit =
    target.label === 'Any'
      ? 0.7
      : years >= target.min && years <= target.max
        ? 1
        : years < target.min
          ? clamp(1 - (target.min - years) / 6, 0.1, 1)
          : clamp(1 - (years - target.max) / 10, 0.3, 1);

  // 3. Soft-signal keywords (domain terms, methodologies) in both documents.
  const SOFT_TERMS = [
    'agile', 'scrum', 'kanban', 'microservices', 'rest api', 'graphql', 'testing',
    'ci/cd', 'code review', 'mentoring', 'leadership', 'communication',
    'scalability', 'performance', 'security', 'accessibility', 'seo',
    'analytics', 'dashboard', 'mobile', 'responsive', 'cloud', 'devops',
  ];
  const sharedTerms = SOFT_TERMS.filter((t) => jd.includes(t) && cv.includes(t));
  const jdTerms = SOFT_TERMS.filter((t) => jd.includes(t));
  const softScore = jdTerms.length ? sharedTerms.length / jdTerms.length : 0.6;

  const score = Math.round(
    clamp(coverage * 50 + seniorityFit * 20 + softScore * 20 + (years > 0 ? 10 : 5))
  );

  return {
    score,
    matchedKeywords: matched.slice(0, 25),
    missingKeywords: missing.slice(0, 25),
    breakdown: {
      coverage: Math.round(coverage * 100),
      seniority: Math.round(seniorityFit * 100),
      keywords: Math.round(softScore * 100),
      targetSeniority: target.label,
    },
    verdict:
      score >= 80
        ? 'Excellent match'
        : score >= 65
          ? 'Strong match'
          : score >= 45
            ? 'Partial match'
            : score >= 25
              ? 'Weak match'
              : 'Not a match',
  };
};

/**
 * A broad readiness benchmark: how well the CV matches the current market
 * demand for a role. Used to seed the dashboard when no specific job is saved.
 */
const benchmarkRoles = (skills, years) => {
  const owned = new Set(skills.map((s) => s.name));
  const results = [];

  for (const [category, entries] of Object.entries(SKILL_TAXONOMY)) {
    const inCategory = entries.filter(([name]) => owned.has(name));
    if (!inCategory.length) continue;
    const share = inCategory.length / Math.max(entries.length, 1);
    const depthBonus = Math.min(
      inCategory.reduce((sum, [n]) => {
        const s = skills.find((x) => x.name === n);
        return sum + (s?.level === 'Expert' ? 3 : s?.level === 'Advanced' ? 2 : 1);
      }, 0) / 20,
      1
    );
    const experienceFactor = clamp(years / 5, 0.3, 1);
    results.push({
      category,
      readiness: Math.round(clamp((share * 60 + depthBonus * 25 + experienceFactor * 15) * 100 / 100)),
    });
  }

  return results.sort((a, b) => b.readiness - a.readiness).slice(0, 6);
};

module.exports = {
  matchAgainstJob,
  extractRequiredSkills,
  benchmarkRoles,
};
