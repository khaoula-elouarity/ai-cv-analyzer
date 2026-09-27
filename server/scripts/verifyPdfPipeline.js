/* Builds a minimal but genuinely valid PDF, then runs it through the real
 * upload -> extract -> analyse pipeline. */
const fs = require('fs');
const path = require('path');
const os = require('os');

const LINES = [
  'Jordan Patel',
  'jordan.patel@email.com | +1 (206) 555-0142 | Seattle, WA',
  '',
  'PROFESSIONAL SUMMARY',
  'Backend engineer with 5 years building payment platforms and data pipelines in Python and Go.',
  '',
  'SKILLS',
  'Python, Go, PostgreSQL, Redis, Docker, AWS, Kubernetes, Terraform, CI/CD, Kafka,',
  'gRPC, REST API, Microservices, Git, Agile, PyTorch, Pandas, SQL, MongoDB, Jest',
  '',
  'EXPERIENCE',
  'Backend Engineer, Stripe',
  '2020 - Present',
  'Reduced payment settlement latency by 55% by rewriting the ledger in Go.',
  'Migrated 40 services from Heroku to Kubernetes with zero downtime.',
  'Mentored 4 engineers and introduced the CI/CD pipeline adopted company-wide.',
  '',
  'Data Engineer, Spotify',
  '2018 - 2020',
  'Built Kafka streaming pipelines processing 3 billion events per day.',
  'Cut infrastructure spend by $1.2M annually by right-sizing Terraform modules.',
  '',
  'EDUCATION',
  'Bachelor of Science, Computer Engineering',
  'University of Washington',
  '2018',
  '',
  'CERTIFICATIONS',
  'AWS Certified Professional, Certified Kubernetes Administrator',
];

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

/** Assemble a one-page PDF using Helvetica, with correct xref offsets. */
const buildPdf = () => {
  const content =
    'BT\n/F1 11 Tf\n50 780 Td\n14 TL\n' +
    LINES.map((l) => `(${esc(l)}) Tj T*`).join('\n') +
    '\nET\n';

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
};

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cvpdf-'));
  const pdfPath = path.join(tmp, 'cv.pdf');
  fs.writeFileSync(pdfPath, buildPdf());
  console.log(`Built valid PDF: ${fs.statSync(pdfPath).size} bytes\n`);

  const { extractText } = require('../services/pdfService');
  const { analyzeLocally } = require('../services/localAnalyzer');

  const { text, charCount, type } = await extractText(pdfPath);
  console.log('== extraction ==');
  console.log('  detected type :', type);
  console.log('  charCount     :', charCount);
  console.log('  first line    :', text.split('\n')[0].trim());
  const ok =
    charCount > 200 &&
    /Jordan Patel/.test(text) &&
    /Kubernetes/.test(text) &&
    /University of Washington/.test(text);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  extracted real text (name, skills, education all present)`);

  const a = analyzeLocally(text);
  console.log('\n== analysis of the extracted text ==');
  console.log('  score            :', a.score);
  console.log('  atsScore         :', a.atsScore);
  console.log('  years            :', a.profile.yearsOfExperience);
  console.log('  skills found     :', a.skills.length);
  console.log('  top role         :', a.suggestedRoles[0]?.title, `${a.suggestedRoles[0]?.matchPercent}%`);
  console.log('  roles            :', a.suggestedRoles.map((r) => `${r.title} (${r.matchPercent}%)`).join(', '));
  console.log('  employers        :', a.experience.map((e) => e.company).filter(Boolean).join(' | '));
  console.log('  quantified bullet:', a.experience.flatMap((e) => e.highlights).find((h) => /55%/.test(h)) || 'NONE');
  console.log('  missing keywords :', a.missingKeywords.slice(0, 6).join(', '));
  console.log('  certifications   :', a.certifications.length);

  const results = [
    ok,
    a.profile.fullName === 'Jordan Patel',
    a.skills.length >= 12,
    a.suggestedRoles[0]?.title === 'Backend Engineer',
    a.experience.some((e) => /Stripe/.test(e.company || '')),
    a.experience.some((e) => /Spotify/.test(e.company || '')),
    a.experience.flatMap((e) => e.highlights).some((h) => /55%/.test(h)),
    a.education.some((e) => /Washington/.test(e.institution)),
    a.certifications.length >= 1,
    a.atsScore > 0,
  ];
  const passed = results.filter(Boolean).length;
  console.log(`\n  ${passed}/${results.length} pipeline assertions passed`);

  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(passed === results.length ? 0 : 1);
})();
