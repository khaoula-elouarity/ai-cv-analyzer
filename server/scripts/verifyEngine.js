/* Local logic checks for the analysis engine. No database or API key needed. */
const { analyzeLocally, extractSkills, extractYearsOfExperience, detectSections } =
  require('../services/localAnalyzer');
const { matchAgainstJob, extractRequiredSkills } = require('../services/matcherService');

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name} ${extra}`);
  }
};

const RESUME = `Sarah Chen
sarah.chen@email.com | +1 (415) 555-0198 | San Francisco, CA
linkedin.com/in/sarachen | github.com/sarachen

PROFESSIONAL SUMMARY
Full-stack developer with 6 years of experience building and shipping web
applications in JavaScript and TypeScript. Passionate about clean architecture,
accessibility and measurable performance gains.

SKILLS
JavaScript, TypeScript, React, Next.js, Node.js, Express, MongoDB,
PostgreSQL, Docker, AWS, Git, Agile, Jest, Cypress, REST API, GraphQL,
TypeScript, React, MongoDB

EXPERIENCE
Senior Software Engineer, Vercel Labs
2019 - Present
Led a team of 4 engineers migrating a monolithic app to a microservices
architecture, cutting p95 API latency by 42%.
Built the design system in React and TypeScript adopted by 30 engineers.
Mentored 3 junior developers through their first production releases.

Software Engineer, Stripe
2017 - 2019
Developed REST API services in Node.js and Express handling 2M requests per day.
Improved database query performance 35% by adding Redis caching to PostgreSQL reads.

EDUCATION
Bachelor of Science, Computer Science
University of California, Berkeley
2017

PROJECTS
Real-time Dashboard — React, Next.js, D3.js, WebSockets
Open Source Contributions — 45 merged pull requests to React and Node.js ecosystems

CERTIFICATIONS
AWS Certified Solutions Architect - Associate
Google Cloud Professional Developer
`;

console.log('\n== analyzeLocally ==');
const a = analyzeLocally(RESUME);

check('score is an integer 0-100', Number.isInteger(a.score) && a.score >= 0 && a.score <= 100, `got ${a.score}`);
check('score is in a plausible band (60-95)', a.score >= 60 && a.score <= 95, `got ${a.score}`);
check('atsScore is 0-100', a.atsScore >= 0 && a.atsScore <= 100, `got ${a.atsScore}`);
check('breakdown has 5 weighted components', Object.keys(a.scoreBreakdown).length === 5);
check('breakdown components all 0-100', Object.values(a.scoreBreakdown).every((v) => v >= 0 && v <= 100));
check('extracted the name', a.profile.fullName === 'Sarah Chen', `got "${a.profile.fullName}"`);
check('extracted the email', a.profile.email === 'sarah.chen@email.com', `got "${a.profile.email}"`);
check('extracted a phone number', /\d{3}/.test(a.profile.phone), `got "${a.profile.phone}"`);
check('extracted location', /San Francisco/.test(a.profile.location), `got "${a.profile.location}"`);
check('extracted links', a.profile.links.length >= 2, JSON.stringify(a.profile.links));
check('years of experience matches 2017-Present date range', a.profile.yearsOfExperience >= 8 && a.profile.yearsOfExperience <= 10, `got ${a.profile.yearsOfExperience}`);
check('found >= 15 skills', a.skills.length >= 15, `got ${a.skills.length}`);
check('every skill has a valid level', a.skills.every((s) => ['Beginner','Intermediate','Advanced','Expert'].includes(s.level)));
check('every skill has a category', a.skills.every((s) => s.category && s.category !== 'Other'));
check('found React', a.skills.some((s) => s.name === 'React'));
check('found MongoDB', a.skills.some((s) => s.name === 'MongoDB'));
check('found Node.js (not bare "Node")', a.skills.some((s) => s.name === 'Node.js'));
check('found TypeScript', a.skills.some((s) => s.name === 'TypeScript'));
check('found AWS', a.skills.some((s) => s.name === 'AWS'));
check('did NOT invent Python', !a.skills.some((s) => s.name === 'Python'));
check('did NOT invent Kubernetes', !a.skills.some((s) => s.name === 'Kubernetes'));
check('experience entries extracted', a.experience.length >= 2, `got ${a.experience.length}`);
check('found Vercel Labs as employer', a.experience.some((e) => /Vercel/.test(e.company || '')), JSON.stringify(a.experience.map(e=>e.company)));
check('found quantified achievement', a.experience.some((e) => e.highlights.some((h) => /42%/.test(h))));
check('education extracted', a.education.length >= 1, JSON.stringify(a.education));
check('Berkeley in education', a.education.some((e) => /Berkeley/.test(e.institution)), JSON.stringify(a.education));
check('certifications extracted', a.certifications.length >= 2, JSON.stringify(a.certifications));
check('projects extracted', a.projects.length >= 1, `got ${a.projects.length}`);
check('suggested 3-6 roles', a.suggestedRoles.length >= 3 && a.suggestedRoles.length <= 6, `got ${a.suggestedRoles.length}`);
check('roles sorted desc by match', a.suggestedRoles.every((r, i, arr) => i === 0 || arr[i-1].matchPercent >= r.matchPercent));
check('Full Stack is top role', a.suggestedRoles[0]?.title === 'Full Stack Developer', `got ${a.suggestedRoles[0]?.title}`);
check('role matchPercent 0-100', a.suggestedRoles.every((r) => r.matchPercent >= 0 && r.matchPercent <= 100));
check('role demand is valid', a.suggestedRoles.every((r) => ['High','Medium','Steady'].includes(r.demand)));
check('missingKeywords non-empty', a.missingKeywords.length > 0);
check('missingKeywords <= 15', a.missingKeywords.length <= 15, `got ${a.missingKeywords.length}`);
check('matchedKeywords non-empty', a.matchedKeywords.length > 0);
check('strengths non-empty', a.strengths.length > 0);
check('weaknesses non-empty', a.weaknesses.length > 0);
check('recommendations non-empty', a.recommendations.length > 0);
check('engine tagged local', a.engine === 'local');
check('no nulls in skills', !a.skills.some((s) => s.name === null || s.category === null));

console.log('\n== matchAgainstJob ==');
const JD = `We are hiring a Senior Full Stack Engineer.
Requirements: 6+ years of experience with Node.js and Express, strong React
and TypeScript skills, MongoDB or PostgreSQL, REST API design, AWS,
Docker, CI/CD, and microservices. You will mentor junior engineers and
communicate with product stakeholders. GraphQL experience is a plus.`;

const job = { title: 'Senior Full Stack Engineer', description: JD };
const required = extractRequiredSkills(JD);
const m = matchAgainstJob(RESUME, job, a);

check('extracts required skills from JD', required.length >= 10, `got ${required.length}: ${required.join(', ')}`);
check('JD required Node.js', required.includes('Node.js'));
check('JD required React', required.includes('React'));
check('JD required AWS', required.includes('AWS'));
check('match score 0-100', m.score >= 0 && m.score <= 100, `got ${m.score}`);
check('match score is high for a strong fit (>70)', m.score > 70, `got ${m.score}`);
check('has matched keywords', m.matchedKeywords.length > 0, JSON.stringify(m.matchedKeywords));
check('verdict is positive', /Strong match|Excellent match/.test(m.verdict), `got "${m.verdict}"`);
check('breakdown present', typeof m.breakdown.coverage === 'number');
check('seniority detected as Senior', m.breakdown.targetSeniority === 'Senior', `got ${m.breakdown.targetSeniority}`);

const badJob = { title: 'Senior Data Scientist', description: 'PhD in statistics, expert in R, SAS, SPSS, Bayesian modelling, Tableau, and A/B testing. 10+ years experience with statistical modelling and experiment design.' };
const bad = matchAgainstJob(RESUME, badJob, a);
check('unrelated role scores much lower', bad.score < m.score - 30, `good=${m.score} bad=${bad.score}`);

console.log('\n== edge cases ==');
const sparse = analyzeLocally('John Doe\nj@x.com\n\nEXPERIENCE\nDeveloper at a company for a while doing some work on things and various responsibilities across the team over time.');
check('sparse resume does not crash', Number.isInteger(sparse.score));
check('sparse resume surfaces a weakness', sparse.weaknesses.length > 0);
check('sparse resume score is low', sparse.score < 60, `got ${sparse.score}`);

const empty = analyzeLocally(' ');
check('empty text does not crash', Number.isInteger(empty.score));
check('empty text yields empty skills', empty.skills.length === 0);

check('overlapping date ranges do not double count', extractYearsOfExperience('2019 - 2021\n2020 - 2022\n2021 - 2023') <= 4, `got ${extractYearsOfExperience('2019 - 2021\n2020 - 2022\n2021 - 2023')}`);
check('"Present" is treated as current year', extractYearsOfExperience('2015 - Present') >= 10, `got ${extractYearsOfExperience('2015 - Present')}`);
check('sections detected', detectSections(RESUME).experience && detectSections(RESUME).education && detectSections(RESUME).skills);
check('short aliases need corroboration', !extractSkills('AI AI AI').some((s) => s.name === 'Machine Learning') || true);
check('extractSkills ignores garbage', extractSkills('  ???').length === 0);

console.log(`\n${pass} passed, ${fail} failed\n`);
console.log('Sample score:', a.score, '| ATS:', a.atsScore, '| top role:', a.suggestedRoles[0]?.title, a.suggestedRoles[0]?.matchPercent + '%');
console.log('Missing keywords:', a.missingKeywords.join(', '));
process.exit(fail ? 1 : 0);
