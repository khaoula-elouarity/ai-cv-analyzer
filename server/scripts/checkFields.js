/**
 * Cross-field smoke test for the local engine.
 *
 * Feeds one CV per profession through analyzeLocally and prints the detected
 * field, suggested roles and advice. This is a human-inspection tool, not an
 * assertion suite — use scripts/verifyAiService.js for pass/fail checks.
 *
 * Run: node scripts/checkFields.js
 */
const { analyzeLocally } = require('../services/localAnalyzer');
const { detectField } = require('../services/fieldDetection');

const CASES = {
  software: `Dan Cole
Senior Software Engineer
dan@example.com
SKILLS
TypeScript, React, Node.js, PostgreSQL, Docker, AWS, Kubernetes, CI/CD, Jest.
EXPERIENCE
Senior Software Engineer, Acme (2021 - present)
- Cut API latency 40% by introducing Redis caching.
- Led migration of a monolith to 12 microservices.
EDUCATION
BSc Computer Science, University of Manchester, 2016`,

  data: `Ana Silva
Data Analyst
ana@example.com
SKILLS
SQL, Power BI, Tableau, Excel, Statistics, Data Analysis, A/B Testing, Pandas.
EXPERIENCE
Data Analyst, RetailCo (2020 - present)
- Built a forecasting dashboard that cut monthly reporting from 3 days to 4 hours.
- Ran A/B tests that increased conversion 9%.
EDUCATION
MSc Statistics, University of Lisbon, 2019`,

  marketing: `Tom Baker
Digital Marketing Manager
tom@example.com
SKILLS
SEO, SEM, Google Analytics, Content Strategy, Copywriting, Paid Media, CRM, Email Marketing.
EXPERIENCE
Digital Marketing Manager, ShopCo (2021 - present)
- Grew organic traffic 140% in 9 months through a content strategy overhaul.
- Launched a paid social campaign that generated 3,200 sign-ups at GBP22 CPA.
EDUCATION
BA Marketing, University of Leeds, 2017`,

  accounting: `Grace Okafor
Chartered Accountant
grace@example.com
SKILLS
Financial Reporting, IFRS, Taxation, Audit, Reconciliation, Bookkeeping, Sage, VAT.
EXPERIENCE
Senior Accountant, Finance House (2019 - present)
- Reduced month-end close from 10 days to 4 across three entities.
- Identified GBP340k in unclaimed tax reliefs.
EDUCATION
ACCA Qualified, 2016
EDUCATION
BSc Accounting, University of Lagos, 2014`,

  healthcare: `Priya Raman
Senior Registered Nurse
priya@example.com
SKILLS
Patient Care, Clinical Assessment, Care Planning, Triage, Infection Control, Medication Administration, Safeguarding.
EXPERIENCE
Senior Registered Nurse, Royal Infirmary (2021 - present)
- Managed a 14-bed acute medical ward with 100% medication accuracy.
- Reduced ward handover incidents 30% with a structured safety checklist.
EDUCATION
BSc Adult Nursing, University of Manchester, 2016
REGISTRATIONS
NMC Registration 76A1234X`,

  education: `Ella Wright
Secondary School Teacher
ella@example.com
SKILLS
Lesson Planning, Classroom Management, Curriculum Development, Differentiation, Assessment, Behaviour Management, Safeguarding.
EXPERIENCE
Classroom Teacher, Oakfield School (2018 - present)
- Raised department attainment 14% over two years through targeted intervention.
- Designed a curriculum adopted by 6 schools.
EDUCATION
BEd Secondary Science, University of Bristol, 2017`,

  sales: `Marcus Lee
Account Executive
marcus@example.com
SKILLS
Negotiation, Sales Pipeline Management, Lead Generation, CRM, Objection Handling, Account Management, Forecasting.
EXPERIENCE
Account Executive, Cloudware (2020 - present)
- Exceeded quota 128% for four consecutive quarters.
- Closed GBP2.4M in new business in year one.
EDUCATION
BA Business, University of Glasgow, 2018`,

  legal: `Yara Haddad
Paralegal
yara@example.com
SKILLS
Legal Research, Contract Drafting, Data Protection, Regulatory Compliance, Documentation, Due Diligence.
EXPERIENCE
Paralegal, Fielding & Co (2019 - present)
- Supported 60+ contract reviews with zero post-signature disputes.
- Maintained the firm's data protection register.
EDUCATION
LLB Law, University of Edinburgh, 2018`,

  hospitality: `Luca Rossi
Head Chef
luca@example.com
SKILLS
Food Safety, HACCP, Menu Planning, Cost Control, Team Leadership, Inventory Management.
EXPERIENCE
Head Chef, Ristorante Sole (2017 - present)
- Maintained a 4.7 review score across 2,000 covers a month.
- Cut food cost 8% with no change in guest satisfaction.
EDUCATION
Culinary Arts Diploma, 2015`,

  operations: `Sarah Novak
Operations Manager
sarah@example.com
SKILLS
Project Management, Process Improvement, Supply Chain Management, Procurement, Lean Six Sigma, Continuous Improvement.
EXPERIENCE
Operations Manager, LogisticsCo (2018 - present)
- Delivered a GBP1.2M programme 6 weeks ahead of schedule.
- Cut order fulfilment time 32% through a revised process.
EDUCATION
BSc Operations Management, 2017`,

  engineering: `Raj Patel
Civil Engineer
raj@example.com
SKILLS
AutoCAD, Health & Safety, Cost Estimation, Regulatory Compliance, Project Management, Quality Assurance.
EXPERIENCE
Civil Engineer, BuildCo (2019 - present)
- Delivered a GBP6M bridge project under budget.
- Maintained zero reportable safety incidents across 3 years.
EDUCATION
MEng Civil Engineering, 2018`,

  hr: `Nina Fischer
HR Business Partner
nina@example.com
SKILLS
Employee Relations, Performance Management, Employment Law, Workforce Planning, Policy Development, Data Protection.
EXPERIENCE
HR Business Partner, ManufacturingCo (2020 - present)
- Cut voluntary attrition 25% after an engagement programme.
- Launched a diversity hiring scheme lifting diverse hires to 38%.
EDUCATION
MA Human Resources, 2019`,

  customer_service: `Chris Doyle
Customer Success Manager
chris@example.com
SKILLS
Customer Success, Account Management, Customer Satisfaction, Escalation Management, SLA Management, Onboarding, CRM.
EXPERIENCE
Customer Success Manager, SaaSVendor (2021 - present)
- Maintained a 96% CSAT across 5,000+ tickets.
- Grew an account from GBP80k to GBP310k ARR.
EDUCATION
BA Business, 2018`,

  research: `Dr Aisha Khan
Research Scientist
aisha@example.com
SKILLS
Research Design, Methodology, Scientific Writing, Grant Writing, Peer Review, Statistical Analysis, Laboratory Techniques.
EXPERIENCE
Research Scientist, Institute (2018 - present)
- Published 8 peer-reviewed papers, 3 as first author.
- Secured GBP450k in grant funding.
EDUCATION
PhD Molecular Biology, 2017`,

  media: `Oliver Grant
Journalist
oliver@example.com
SKILLS
Writing, Editing, Interviewing, Storytelling, Fact Checking, Research, Deadline Management.
EXPERIENCE
Staff Journalist, The Daily (2019 - present)
- Wrote 40 published pieces averaging 25,000 readers.
- Broke a regional story picked up by national broadcast.
EDUCATION
BA Journalism, 2017`,

  retail: `Beth Walsh
Store Manager
beth@example.com
SKILLS
Retail Operations, Merchandising, Visual Merchandising, Stock Control, Customer Service, Store Operations, Team Leadership.
EXPERIENCE
Store Manager, High Street Retail (2018 - present)
- Exceeded sales target 112% for 14 consecutive months.
- Lifted store conversion 19% through a revised layout.
EDUCATION
BA Business, 2016`,

  design: `Leo Park
Product Designer
leo@example.com
SKILLS
Figma, User Research, Prototyping, Wireframing, Design Systems, Accessibility, Usability Testing.
EXPERIENCE
Product Designer, FintechCo (2020 - present)
- Raised checkout conversion 12% after a usability test round.
- Built a 40-component design system.
EDUCATION
BA Interaction Design, 2018`,

  human_resources_noop: `Generic Person
generic@example.com
SKILLS
Communication, Leadership, Time Management, Problem Solving.
EXPERIENCE
Coordinator, Acme (2020 - 2024)
- Delivered support to internal stakeholders and external partners.
EDUCATION
BA, 2018`,
};

// Software CVs are EXPECTED to be told about GitHub, so the leak check only
// applies to non-technical fields.
const TECH_ONLY = /github|tech stack|codebase|repository|node\.js|kubernetes|react|terraform|graphql|api latency|programming|microservices|docker|express/i;

// The CASES keys are display names; these are the canonical field keys.
const FIELD_KEYS = {
  engineering: 'engineering_manufacturing',
  hr: 'human_resources',
  human_resources_noop: 'general',
};

let bad = 0;
for (const [name, text] of Object.entries(CASES)) {
  const expected = FIELD_KEYS[name] || name;
  const r = analyzeLocally(text);
  const detection = detectField(text, { skills: r.skills, experience: r.experience });
  const copy = [...r.recommendations, ...r.weaknesses, ...r.strengths].join(' | ');
  const techLeak = r.field !== 'software' && TECH_ONLY.test(copy);
  const roles = r.suggestedRoles.map((x) => x.title).join(', ') || '(none)';
  const ok = r.field === expected && !techLeak;
  if (!ok) bad += 1;
  console.log(`${ok ? 'OK  ' : 'BAD '} ${name.padEnd(22)} -> ${r.field} (${r.fieldConfidence}%)`);
  console.log(`       roles: ${roles}`);
  console.log(`       missing: ${r.missingKeywords.slice(0, 5).join(', ')}`);
  console.log(`       rec[0]: ${r.recommendations[0] || '(none)'}`);
  if (r.recommendations[1]) console.log(`       rec[1]: ${r.recommendations[1]}`);
  if (techLeak) {
    const leak = copy.match(TECH_ONLY);
    console.log(`       !! tech-specific advice leaked: ${leak}`);
  }
  if (r.field !== expected) console.log(`       !! expected ${expected}`);
  console.log(`       detect: ${detection.field} ${detection.confidence}% [${detection.evidence.slice(0, 3).join('; ')}]`);
  console.log('');
}

console.log(bad === 0 ? 'all fields detected correctly, no tech leakage' : `${bad} case(s) wrong`);
process.exit(bad === 0 ? 0 : 1);
