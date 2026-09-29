/**
 * Verifies the AI service layer without touching MongoDB or spending a token.
 *
 * `axios.post` is stubbed so the real request shape can be asserted (URL, model,
 * auth header, prompt) and the model can be made to return hostile output —
 * fenced JSON, prose around the object, nulls, wrong types, out-of-range
 * numbers — to prove the sanitiser and the fallback path hold.
 *
 * Run: node scripts/verifyAiService.js
 */
process.env.AI_PROVIDER = 'xai';
process.env.XAI_API_KEY = 'test-key-not-real';
require('dotenv').config();

const assert = require('assert');
const axios = require('axios');

const realPost = axios.post;
const calls = [];
let nextResponse = null;
let nextError = null;

axios.post = async (url, body, config) => {
  calls.push({ url, body, config });
  if (nextError) {
    const err = nextError;
    nextError = null;
    throw err;
  }
  return { data: nextResponse };
};

const {
  analyzeResume,
  matchResumeWithJob,
  parseLooseJson,
  sanitise,
  sanitiseMatch,
} = require('../services/aiService');
const { analyzeLocally, SCORE_WEIGHTS } = require('../services/localAnalyzer');
const { detectField } = require('../services/fieldDetection');

/**
 * A clinical CV. Used to prove the analyser is not software-biased: it must
 * detect the field, use clinical vocabulary, and never suggest a GitHub link
 * or a tech-stack project to a nurse.
 */
const NURSE_RESUME = `Priya Raman
Senior Registered Nurse
priya.raman@example.com | Manchester, UK

PROFESSIONAL SUMMARY
Senior band 6 nurse with 9 years in acute medical wards, with a specialism in emergency and critical care.

SKILLS
Patient Care, Clinical Assessment, Care Planning, Triage, Patient Safety, Infection Control, Medication Administration, Clinical Documentation, Safeguarding, First Aid, Interprofessional Collaboration, Evidence-Based Practice.

EXPERIENCE
Senior Registered Nurse, Royal Infirmary (2021 - present)
- Managed a 14-bed acute medical ward with 100% medication administration accuracy.
- Reduced ward handover incidents 30% by introducing a structured safety checklist.
- Triage lead for the emergency department, seeing 40 patients per shift.

Registered Nurse, City General Hospital (2016 - 2021)
- Delivered care for a caseload of 28 complex patients across three wards.
- Mentored 6 newly qualified nurses through their first year.

EDUCATION
BSc (Hons) Adult Nursing, University of Manchester, 2016

REGISTRATIONS
NMC Registration: 76A1234X

CERTIFICATIONS
IV Cannulation and IV Therapy (City & Guilds)
Advanced Life Support (Resuscitation Council UK)`;

const NURSE_JOB = `We are recruiting a Senior Band 6 Registered Nurse for our acute medical unit.
Requirements: NMC registration, patient assessment, care planning, triage, infection control, medication administration, evidence-based practice, and experience mentoring newly qualified staff.
You will take an active role in clinical governance and audit.`;

const RESUME = `Jane Doe
Senior Backend Engineer
jane@example.com | Berlin

SUMMARY
Backend engineer with 8 years building distributed systems in Node.js and Python.

SKILLS
JavaScript, TypeScript, Node.js, Express, PostgreSQL, Docker, AWS, Kubernetes, Kafka, Redis, GraphQL, Terraform.

EXPERIENCE
Senior Engineer, Northwind Labs (2021 - present)
- Cut payment settlement latency by 55% by rewriting the ledger in Go.
- Led migration of a legacy monolith to 12 microservices.

EDUCATION
BSc Computer Science, TU Berlin, 2015

CERTIFICATIONS
AWS Certified Solutions Architect`;

const JOB = `We are hiring a Senior Backend Engineer.
Requirements: Node.js, PostgreSQL, Docker, Kubernetes, Kafka, Go, Terraform, GraphQL.
You will mentor junior engineers and own service reliability.`;

const modelAnalysis = {
  score: 84,
  scoreBreakdown: { skills: 90, experience: 85, education: 70, formatting: 80, keywords: 88 },
  atsScore: 91,
  profile: {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+49 30 1234567',
    location: 'Berlin',
    links: ['https://github.com/jane'],
    summary: 'Backend engineer focused on distributed systems.',
    yearsOfExperience: 8,
  },
  skills: [
    { name: 'Node.js', category: 'Backend', level: 'Expert', mentions: 6 },
    { name: 'PostgreSQL', category: 'Database', level: 'Advanced', mentions: 3 },
    { name: 'Docker', category: 'DevOps', level: 'Advanced', mentions: 4 },
    { name: 'Kubernetes', category: 'DevOps', level: 'Intermediate', mentions: 2 },
    { name: 'Kafka', category: 'Backend', level: 'Advanced', mentions: 2 },
  ],
  matchedKeywords: ['Node.js', 'Docker'],
  missingKeywords: ['Go'],
  experience: [{ title: 'Senior Engineer', company: 'Northwind Labs', period: '2021 - present', highlights: ['Cut latency 55%'] }],
  education: [{ degree: 'BSc Computer Science', institution: 'TU Berlin', year: '2015' }],
  certifications: ['AWS Certified Solutions Architect'],
  languages: ['English'],
  projects: [{ name: 'Ledger rewrite', description: 'Go service', stack: ['Go'] }],
  strengths: ['Quantified impact.'],
  weaknesses: ['No GraphQL depth.'],
  recommendations: ['Add a Go project.'],
  suggestedRoles: [{ title: 'Backend Engineer', matchPercent: 88, demand: 'High', reason: 'Strong overlap', topSkills: ['Node.js'] }],
};

const reply = (content) => ({ choices: [{ message: { content } }] });

const check = (label, fn) => {
  try {
    fn();
    console.log(`  PASS  ${label}`);
    return 0;
  } catch (err) {
    console.log(`  FAIL  ${label}\n        ${err.message}`);
    return 1;
  }
};

(async () => {
  let failures = 0;

  // ---------------------------------------------------------------- provider
  console.log('\nProvider request shape');
  nextResponse = reply(JSON.stringify(modelAnalysis));
  const result = await analyzeResume(RESUME);
  const call = calls.at(-1);

  failures += check('posts to the xAI chat completions endpoint', () =>
    assert.strictEqual(call.url, 'https://api.x.ai/v1/chat/completions')
  );
  failures += check(`uses the configured model (${call.body.model})`, () =>
    assert.ok(call.body.model.length > 0)
  );
  failures += check('sends the API key as a bearer token', () =>
    assert.strictEqual(call.config.headers.Authorization, 'Bearer test-key-not-real')
  );
  failures += check('requests JSON output', () =>
    assert.deepStrictEqual(call.body.response_format, { type: 'json_object' })
  );
  failures += check('includes a system message demanding bare JSON', () =>
    assert.match(call.body.messages[0].content, /single valid JSON object/)
  );

  const prompt = call.body.messages[1].content;
  failures += check('prompt states the category weights', () => {
    for (const [k, v] of Object.entries(SCORE_WEIGHTS)) {
      assert.ok(
        prompt.includes(`"${k}": ${Math.round(v * 100)}%`),
        `weight for ${k} missing from prompt`
      );
    }
  });
  failures += check('prompt requires score to equal the weighted sum', () =>
    assert.match(prompt, /weighted sum/)
  );

  // -------------------------------------------------------------- analysis
  console.log('\nanalyzeResume');
  failures += check('adopts the model score and engine', () => {
    assert.strictEqual(result.score, 84);
    assert.strictEqual(result.engine, 'xai');
  });
  failures += check('keeps the model profile', () =>
    assert.strictEqual(result.profile.fullName, 'Jane Doe')
  );
  failures += check('records the model score breakdown', () =>
    assert.strictEqual(result.scoreBreakdown.skills, 90)
  );

  // Hostile model output. `analyzeResume` discards a result carrying fewer than
  // three skills in favour of the local engine, so the coercion rules are
  // asserted against `sanitise` directly rather than through the endpoint.
  const local = analyzeLocally(RESUME);
  const hostile = {
    score: 9999,
    scoreBreakdown: { skills: 'eighty', experience: null, education: undefined },
    atsScore: -50,
    profile: null,
    skills: 'not-an-array',
    matchedKeywords: [null, '', 'React', { x: 1 }],
    strengths: [null, '', 'Real strength', { x: 1 }],
    experience: [{ title: 'Dev', highlights: 'not-an-array' }],
    recommendations: 'nope',
  };
  const rescued = sanitise(hostile, local);

  failures += check('sanitise clamps an out-of-range score to 100', () =>
    assert.strictEqual(rescued.score, 100)
  );
  failures += check('sanitise clamps a negative atsScore to 0', () =>
    assert.strictEqual(rescued.atsScore, 0)
  );
  failures += check('sanitise coerces a non-array skills field to an array', () =>
    assert.ok(Array.isArray(rescued.skills))
  );
  failures += check('sanitise drops null/non-string entries from string arrays', () =>
    assert.ok(rescued.strengths.every((s) => typeof s === 'string' && s.length))
  );
  failures += check('sanitise falls back to the local profile when profile is null', () => {
    assert.ok(rescued.profile && typeof rescued.profile === 'object');
    assert.strictEqual(rescued.profile.fullName, local.profile.fullName);
  });
  failures += check('sanitise substitutes local values for unparseable breakdown numbers', () => {
    assert.ok(Number.isFinite(rescued.scoreBreakdown.skills));
    assert.strictEqual(rescued.scoreBreakdown.skills, local.scoreBreakdown.skills);
  });
  failures += check('sanitise forces a non-array recommendations field to an array', () =>
    assert.ok(Array.isArray(rescued.recommendations))
  );
  failures += check('sanitise normalises a bad skill level to Intermediate', () =>
    assert.strictEqual(sanitise({ skills: [{ name: 'Go', level: 'Godlike' }] }, local).skills[0].level, 'Intermediate')
  );

  // The same payload returned through the real endpoint must not be adopted
  // wholesale: the sparse guard has to reject it first.
  nextResponse = reply('Here is the JSON you asked for:\n```json\n' + JSON.stringify(hostile) + '\n```\nHope this helps!');
  const viaEndpoint = await analyzeResume(RESUME);
  failures += check('strips prose and fences, then distrusts the sparse result', () => {
    assert.strictEqual(viaEndpoint.engine, 'local');
    assert.ok(viaEndpoint.skills.length >= 5);
  });

  // Empty-but-valid response must be distrusted.
  nextResponse = reply(JSON.stringify({ score: 50, skills: [] }));
  const sparse = await analyzeResume(RESUME);
  failures += check('rejects a too-sparse model result and uses the local engine', () => {
    assert.strictEqual(sparse.engine, 'local');
    assert.ok(sparse.skills.length >= 5, `expected local skills, got ${sparse.skills.length}`);
  });

  // Provider failure.
  nextError = Object.assign(new Error('boom'), {
    response: { data: { error: { message: 'rate limited' } } },
  });
  const fell = await analyzeResume(RESUME);
  failures += check('falls back to the local engine when the provider throws', () => {
    assert.strictEqual(fell.engine, 'local');
    assert.ok(fell.aiError.includes('rate limited'));
  });

  nextError = new Error('network down');
  const localOnly = await analyzeResume(RESUME);
  failures += check('never hard-fails on a provider outage', () =>
    assert.ok(localOnly.score >= 0 && localOnly.score <= 100)
  );

  // ------------------------------------------------- universal / no-tech-bias
  console.log('\nField detection (non-software professions)');

  const nurseField = detectField(NURSE_RESUME, { skills: analyzeLocally(NURSE_RESUME).skills });
  failures += check('detects a clinical CV as healthcare, not software', () =>
    assert.strictEqual(nurseField.field, 'healthcare')
  );
  failures += check('assigns the healthcare label', () =>
    assert.match(nurseField.label, /Healthcare/i)
  );
  failures += check('reports evidence for the detection', () =>
    assert.ok(nurseField.evidence.length > 0)
  );

  const nurseLocal = analyzeLocally(NURSE_RESUME);
  failures += check('local engine labels the nurse CV with the healthcare field', () => {
    assert.strictEqual(nurseLocal.field, 'healthcare');
    assert.match(nurseLocal.fieldLabel, /Healthcare/i);
  });
  failures += check('an AI result still carries the field label, confidence and evidence', () => {
    // The model payload above names no field, so the deterministic detection
    // stands. The metadata must survive sanitisation or the frontend field
    // card silently disappears on every AI-backed analysis.
    assert.ok(result.field, 'field missing from the AI result');
    assert.ok(result.fieldLabel, 'fieldLabel missing from the AI result');
    assert.match(result.fieldLabel, /Software|Developer|Engineering/i);
    assert.ok(result.fieldConfidence > 0, 'fieldConfidence missing from the AI result');
    assert.ok(Array.isArray(result.fieldEvidence) && result.fieldEvidence.length);
  });
  failures += check('sanitise always re-labels, even when the model names no field', () => {
    const out = sanitise({ skills: [{ name: 'Go' }] }, nurseLocal);
    assert.strictEqual(out.field, 'healthcare');
    assert.strictEqual(out.fieldLabel, nurseLocal.fieldLabel);
    assert.ok(out.fieldEvidence.length);
  });
  failures += check('a model field override re-derives the confidence and evidence', () => {
    // A healthcare label on a backend CV: the label must follow the model, but
    // the confidence/evidence must be recomputed, not inherited from software.
    nextResponse = reply(JSON.stringify({ ...modelAnalysis, field: 'healthcare' }));
    return analyzeResume(RESUME).then((overridden) => {
      assert.strictEqual(overridden.field, 'healthcare');
      assert.match(overridden.fieldLabel, /Healthcare/i);
      assert.ok(
        overridden.fieldEvidence.join(' ') !== (result.fieldEvidence || []).join(' '),
        'evidence still describes the original field'
      );
    });
  });
  failures += check('local engine only suggests clinical roles for a nurse', () => {
    const titles = nurseLocal.suggestedRoles.map((r) => r.title);
    assert.ok(titles.length, 'expected at least one role suggestion');
    const banned = /engineer|developer|devops|designer/i;
    assert.ok(
      titles.every((t) => !banned.test(t)),
      `non-clinical roles suggested to a nurse: ${titles.join(', ')}`
    );
  });
  failures += check('missing keywords are clinical, not software', () => {
    const all = [...nurseLocal.missingKeywords, ...nurseLocal.matchedKeywords].join(' | ');
    assert.ok(!/kubernetes|terraform|react|node\.js|graphql/i.test(all), all);
  });
  failures += check('recommendations never tell a nurse to add a GitHub link', () => {
    const copy = [
      ...nurseLocal.recommendations,
      ...nurseLocal.weaknesses,
      ...nurseLocal.strengths,
    ].join(' | ');
    assert.ok(!/github|tech stack|repository|codebase|programming/i.test(copy), copy);
  });
  failures += check('recommendations reference clinical evidence, e.g. registration', () => {
    const copy = nurseLocal.recommendations.join(' | ');
    assert.ok(
      /registration|licence|qualification|credential/i.test(copy),
      `no clinical credential advice found in: ${copy}`
    );
  });
  failures += check('a CV with no field signal falls back to general, not software', () => {
    const generic = analyzeLocally('Somebody\nemail@example.com\n\nWORK EXPERIENCE\nCoordinator, Acme (2020 - 2024)\n- Delivered support to internal stakeholders.');
    assert.ok(
      ['general'].includes(generic.field),
      `expected general, got ${generic.field}`
    );
  });
  failures += check('the local engine surfaces the NMC registration number', () => {
    assert.ok(
      nurseLocal.registrations.some((r) => /76A1234X/.test(r)),
      `registrations: ${JSON.stringify(nurseLocal.registrations)}`
    );
  });
  failures += check('a memberships section is not read as certifications', () => {
    const withBodies = analyzeLocally(
      `${NURSE_RESUME}\n\nPROFESSIONAL MEMBERSHIPS\nRoyal College of Nursing\nNursing and Midwifery Council`
    );
    assert.ok(withBodies.affiliations.includes('Royal College of Nursing'), JSON.stringify(withBodies.affiliations));
    assert.ok(
      !withBodies.affiliations.includes('Advanced Life Support (Resuscitation Council UK)'),
      'certifications leaked into affiliations'
    );
  });

  // The prompt itself must carry the field brief and the no-GitHub instruction.
  nextResponse = reply(JSON.stringify(modelAnalysis));
  await analyzeResume(NURSE_RESUME, { title: 'Senior Band 6 Registered Nurse', description: NURSE_JOB });
  const nursePrompt = calls.at(-1).body.messages[1].content;
  failures += check('prompt names the target job title, not the object', () => {
    assert.ok(
      nursePrompt.includes('TARGET JOB TITLE: Senior Band 6 Registered Nurse'),
      'target job title missing or stringified'
    );
    assert.ok(!/\[object Object\]/.test(nursePrompt), 'prompt contains [object Object]');
  });
  failures += check('prompt names the detected profession to the model', () =>
    assert.match(nursePrompt, /CANDIDATE'S FIELD: Healthcare/)
  );
  failures += check('prompt tells the model to judge against that field only', () =>
    assert.match(nursePrompt, /Judge every criterion below against Healthcare standards/)
  );
  failures += check('prompt forbids software advice for non-technical candidates', () =>
    assert.match(nursePrompt, /do not recommend software-specific evidence/i)
  );
  failures += check('prompt asks for registrations in regulated fields', () =>
    assert.match(nursePrompt, /"registrations"/)
  );
  failures += check('prompt flags regulated fields as gating', () =>
    assert.match(nursePrompt, /REGULATED field/)
  );
  failures += check('system prompt names every profession class, not just software', () => {
    const sys = calls.at(-1).body.messages[0].content;
    for (const word of ['Marketing', 'accounting', 'medicine', 'teaching', 'law', 'sales', 'hospitality']) {
      assert.ok(sys.includes(word), `system prompt never mentions ${word}`);
    }
    assert.match(sys, /NEVER suggest software-specific evidence/);
  });

  const nurseMatch = await matchResumeWithJob(
    { ...nurseLocal, field: 'healthcare' },
    NURSE_JOB,
    { title: 'Senior Band 6 Registered Nurse' }
  );
  failures += check('match prompt is field-aware for a nursing role', () => {
    const p = calls.at(-1).body.messages[1].content;
    assert.match(p, /CANDIDATE'S FIELD: Healthcare/);
    assert.ok(!/microservices/i.test(p));
  });
  failures += check('deterministic matcher scores a nurse against a nursing post', () => {
    assert.ok(nurseMatch.score > 0, `expected a real score, got ${nurseMatch.score}`);
    assert.ok(
      nurseMatch.matchedKeywords.length,
      'expected clinical skills to be matched'
    );
  });
  failures += check('nurse match keywords are clinical, not software', () => {
    const all = [...nurseMatch.matchedKeywords, ...nurseMatch.missingKeywords].join(' | ');
    assert.ok(!/kubernetes|node\.js|docker|terraform/i.test(all), all);
  });

  // ------------------------------------------------------------------ match
  console.log('\nmatchResumeWithJob');
  const analysis = analyzeLocally(RESUME);

  nextResponse = reply(JSON.stringify({
    score: 78,
    matchedSkills: ['Node.js', 'PostgreSQL', 'Docker'],
    missingSkills: ['Go', 'Terraform'],
    extraSkills: ['Kafka'],
    seniorityFit: 'Align',
    recommendations: ['Highlight Kubernetes scale.'],
    summary: 'Strong match with a Go gap.',
  }));
  const match = await matchResumeWithJob(analysis, JOB, { title: 'Senior Backend Engineer' });

  failures += check('calls the provider with a match prompt', () => {
    const m = calls.at(-1);
    assert.strictEqual(m.body.messages[0].role, 'system');
    assert.match(m.body.messages[1].content, /JOB DESCRIPTION/);
  });
  failures += check('returns the compatibility score', () =>
    assert.strictEqual(match.score, 78)
  );
  failures += check('returns matched skills', () =>
    assert.ok(match.matchedKeywords.includes('Node.js'))
  );
  failures += check('returns missing skills', () =>
    assert.ok(match.missingKeywords.includes('Go'))
  );
  failures += check('returns recommendations', () =>
    assert.ok(Array.isArray(match.recommendations) && match.recommendations.length)
  );
  failures += check('carries a verdict and breakdown from the deterministic matcher', () => {
    assert.ok(match.verdict);
    assert.ok(match.breakdown);
  });

  // Deterministic-only path: no provider at all.
  const prevProvider = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = 'local';
  delete require.cache[require.resolve('../config/env')];
  delete require.cache[require.resolve('../services/aiService')];
  const localAi = require('../services/aiService');
  const localMatch = await localAi.matchResumeWithJob(analysis, JOB, {
    title: 'Senior Backend Engineer',
  });
  failures += check('works with no AI provider configured', () => {
    assert.strictEqual(localMatch.engine, 'local');
    assert.ok(localMatch.score > 0, `expected a real score, got ${localMatch.score}`);
    assert.ok(localMatch.matchedKeywords.length, 'expected matched keywords');
  });
  failures += check('deterministic score stays within 0-100', () => {
    assert.ok(localMatch.score >= 0 && localMatch.score <= 100);
  });
  process.env.AI_PROVIDER = prevProvider;

  // ---------------------------------------------------------------- helpers
  console.log('\nHelpers');
  failures += check('parseLooseJson survives braces inside strings', () =>
    assert.deepStrictEqual(
      parseLooseJson('noise {"a":"}{","b":1} trailing'),
      { a: '}{', b: 1 }
    )
  );
  failures += check('parseLooseJson rejects a response with no object', () =>
    assert.throws(() => parseLooseJson('I cannot help with that'))
  );
  failures += check('sanitiseMatch clamps score and drops bad entries', () => {
    const out = sanitiseMatch({ score: 500, matchedSkills: [null, 'Go'] }, { score: 10 });
    assert.strictEqual(out.score, 100);
    assert.deepStrictEqual(out.matchedKeywords, ['Go']);
  });

  axios.post = realPost;

  console.log(
    `\n${failures === 0 ? 'all assertions passed' : `${failures} assertion(s) failed`}\n`
  );
  process.exit(failures === 0 ? 0 : 1);
})();
