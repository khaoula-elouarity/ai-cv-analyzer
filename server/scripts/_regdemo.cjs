const { analyzeLocally } = require('../services/localAnalyzer');

const NURSE = `Priya Raman
Senior Registered Nurse
priya@example.com

EXPERIENCE
Senior Registered Nurse, Royal Infirmary (2021 - present)
- Reduced ward handover incidents 30% with a new checklist.

EDUCATION
BSc (Hons) Adult Nursing, University of Manchester, 2016

REGISTRATIONS
NMC Registration: 76A1234X
GMC GP Register 7101234

PROFESSIONAL MEMBERSHIPS
Royal College of Nursing (RCN)
Nursing and Midwifery Council

CERTIFICATIONS
IV Cannulation and IV Therapy (City & Guilds)
Advanced Life Support`;

const LAWYER = `Marcus Hale
Solicitor, Commercial Property
marcus@example.com

EXPERIENCE
Associate Solicitor, Hale & Voss LLP (2019 - present)
- Settled 30 commercial lease disputes worth GBP12M.

EDUCATION
LLB Law, University of Leeds, 2012
PGDL, 2013
SQE Qualifying Certificate, 2014

PROFESSIONAL REGISTRATION
Solicitors Regulation Authority: 512847

MEMBERSHIPS
Law Society of England and Wales`;

for (const [name, cv] of [['nurse', NURSE], ['lawyer', LAWYER]]) {
  const r = analyzeLocally(cv);
  console.log('='.repeat(70));
  console.log(`${name} -> field=${r.field} (${r.fieldLabel})`);
  console.log('  registrations :', JSON.stringify(r.registrations));
  console.log('  affiliations  :', JSON.stringify(r.affiliations));
  console.log('  certifications:', JSON.stringify(r.certifications));
  console.log('  recs:');
  r.recommendations.forEach((x) => console.log('    > ' + x));
}
