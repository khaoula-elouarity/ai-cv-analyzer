const fs = require('fs');
const { analyzeLocally } = require('../services/localAnalyzer');

const src = fs.readFileSync('scripts/verifyAiService.js', 'utf8');
const start = src.indexOf('const NURSE_RESUME = `') + 'const NURSE_RESUME = `'.length;
const end = src.indexOf('`;', start);
const cv = src.slice(start, end);

const r = analyzeLocally(cv);
console.log('registrations :', JSON.stringify(r.registrations, null, 0));
console.log('affiliations  :', JSON.stringify(r.affiliations, null, 0));
console.log('certifications:', JSON.stringify(r.certifications, null, 0));
