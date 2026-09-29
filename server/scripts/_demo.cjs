const { analyzeLocally } = require('../services/localAnalyzer');

const CASES = {
  dermatologist: `Dr Sofia Mendes
Consultant Dermatologist
sofia@example.com

PROFESSIONAL SUMMARY
Consultant dermatologist with 14 years in clinical practice, specialist interests in skin cancer and inflammatory disease.

SKILLS
Patient Care, Clinical Assessment, Care Planning, Triage, Patient Safety, Infection Control, Clinical Documentation, Evidence-Based Practice, Dermatology, Skin Cancer Screening, Biopsy Interpretation, Mohs Surgery, Team Leadership, Interprofessional Collaboration.

EXPERIENCE
Consultant Dermatologist, City Hospital (2018 - present)
- Lead the skin cancer screening service covering a catchment of 400,000 patients.
- Reduced missed-diagnosis rate 22% by introducing a triage protocol.
- Supervise 4 clinical fellows and deliver 300 outpatient clinics a year.

EDUCATION
MBBS, University of Sao Paulo, 2005
MD Dermatology, University of Sao Paulo, 2010

REGISTRATIONS
GMC Registration 7452918

CERTIFICATIONS
Advanced Mohs Micrographic Surgery`,

  teacher: `James Whitfield
Head of Department of Science
james@example.com

PROFESSIONAL SUMMARY
Classroom teacher and Head of Science with 12 years in secondary education, specialising in chemistry and exam preparation.

SKILLS
Lesson Planning, Classroom Management, Curriculum Development, Differentiation, Behaviour Management, Student Engagement, Parent Engagement, Assessment, Grading, Safeguarding, Educational Technology, Formative Assessment.

EXPERIENCE
Head of Department, Oakfield School (2019 - present)
- Raised department attainment 14% over two years through targeted intervention.
- Built a curriculum adopted by 6 schools in the trust.
- Manage a team of 9 teachers and run weekly data reviews.

Science Teacher, Kingsway Academy (2013 - 2019)
- Delivered GCSE and A-level chemistry to classes of up to 30.

EDUCATION
BSc Chemistry, University of Bristol, 2012
PGCE Secondary Science, 2013

REGISTRATIONS
QTS: 13HG4721`,

  accountant: `Aisha Rahman
Financial Controller
aisha@example.com

PROFESSIONAL SUMMARY
Chartered accountant with 10 years managing statutory reporting and month-end close for mid-market groups.

SKILLS
Financial Reporting, IFRS, Management Accounting, Budgeting, Forecasting, Taxation, Audit, Reconciliation, Cash Flow Management, Regulatory Compliance, Variance Analysis, Sage, Leadership.

EXPERIENCE
Financial Controller, GroupCo (2020 - present)
- Reduced month-end close from 10 days to 4 across three entities.
- Own a GBP14M annual budget and a 6-person finance team.
- Delivered first-time clean statutory audit with zero material findings.

Senior Accountant, Audit Partners LLP (2016 - 2020)
- Prepared statutory accounts for 20+ SME clients.

EDUCATION
ACCA Qualified, 2015
BA Accounting, 2012`,

  marketer: `Emily Novak
Head of Growth Marketing
emily@example.com

PROFESSIONAL SUMMARY
Growth marketer with 8 years across performance marketing, SEO and lifecycle, focused on acquisition efficiency.

SKILLS
SEO, SEM, Google Analytics, Paid Media, Content Strategy, Copywriting, CRM, Email Marketing, Audience Segmentation, Campaign Management, Conversion Rate, A/B Testing, Brand Strategy, Stakeholder Management.

EXPERIENCE
Head of Growth Marketing, DTC Brands (2021 - present)
- Grew organic traffic 140% in 9 months through a content strategy overhaul.
- Cut blended CAC 38% while increasing spend 2x.
- Built and managed a team of 6 across paid, SEO and lifecycle.

Digital Marketing Manager, ShopCo (2017 - 2021)
- Launched a paid social campaign generating 3,200 sign-ups at GBP22 CPA.

EDUCATION
BA Marketing, University of Leeds, 2016`,
};

for (const [name, cv] of Object.entries(CASES)) {
  const r = analyzeLocally(cv);
  console.log('='.repeat(78));
  console.log(`${name}  ->  field=${r.field} (${r.fieldLabel}) ${r.fieldConfidence}%`);
  console.log(`evidence: ${r.fieldEvidence.join('; ')}`);
  console.log(`score=${r.score} ats=${r.atsScore} breakdown=${JSON.stringify(r.scoreBreakdown)}`);
  console.log(`roles: ${r.suggestedRoles.map((x) => `${x.title} ${x.matchPercent}% ${x.demand}`).join(' | ')}`);
  console.log(`skills(${r.skills.length}): ${r.skills.slice(0, 8).map((s) => `${s.name}[${s.category}]`).join(', ')}`);
  console.log(`missing: ${r.missingKeywords.join(', ')}`);
  console.log('STRENGTHS'); r.strengths.forEach((s) => console.log('  + ' + s));
  console.log('WEAKNESSES'); r.weaknesses.forEach((s) => console.log('  - ' + s));
  console.log('RECOMMENDATIONS'); r.recommendations.forEach((s) => console.log('  > ' + s));
  console.log('');
}
