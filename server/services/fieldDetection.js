/**
 * Universal field detection.
 *
 * The analyser must work for every profession, not just software. This module
 * is the single source of truth for "what kind of career is this person in",
 * and it drives every downstream decision:
 *
 *   - the AI prompt is told which field the candidate is in
 *   - the local engine suggests roles from THAT field's role ladder
 *   - the local engine's strengths / weaknesses / recommendations are
 *     field-specific, so a nurse is never told to add a GitHub link
 *
 * Detection is deterministic and evidence-based. It scores three signals:
 *
 *   1. Explicit job titles from the experience section (strongest)
 *   2. Field keyword hits across the whole CV
 *   3. Competency hits (tools, methods, standards) tied to the field
 *
 * The AI provider performs its own detection in parallel; both are surfaced to
 * the user and disagreement is not an error, because the deterministic engine
 * is deliberately conservative and the model reads the whole document.
 */

/**
 * Every supported field.
 *
 * `signals`     terms that indicate the field. Weight 1-3: 3 is near-conclusive
 *               ("chartered accountant", "patient", "trial"), 1 is supporting.
 * `titles`      job titles that strongly indicate the field.
 * `competencies` canonical skill names that count as hard evidence.
 * `portfolio`   how a candidate in this field proves ability. This is the key
 *               to killing the "add a GitHub link" problem: a marketer gets a
 *               campaign link, a nurse gets a registration number, an
 *               accountant gets a licence, a teacher gets a portfolio.
 * `metrics`     example outcomes a recruiter in this field cares about. Used
 *               to give field-accurate advice instead of "API latency 40%".
 * `credentials` what counts as a credential in this field.
 */
const FIELDS = {
  software: {
    label: 'Software Engineering & IT',
    altLabels: ['Software', 'Technology', 'IT', 'Computing', 'Tech'],
    signals: [
      ['software engineer', 3], ['software developer', 3], ['full stack', 3],
      ['frontend', 3], ['front-end', 3], ['backend', 3], ['back-end', 3],
      ['web developer', 3], ['web development', 3], ['mobile developer', 3],
      ['devops', 3], ['site reliability', 3], ['qa engineer', 3],
      ['test automation', 2], ['api', 2], ['microservices', 2],
      ['repository', 2], ['version control', 2], ['deploy', 2],
      ['programming', 2], ['codebase', 2], ['debugging', 2],
      ['open source', 1], ['agile sprint', 1], ['ci/cd', 2],
      ['cloud infrastructure', 2], ['database', 1], ['technical documentation', 1],
    ],
    titles: [
      'software engineer', 'software developer', 'developer', 'programmer',
      'frontend engineer', 'backend engineer', 'full stack engineer',
      'full stack developer', 'web developer', 'mobile developer',
      'devops engineer', 'site reliability engineer', 'qa engineer',
      'test engineer', 'solutions architect', 'systems administrator',
    ],
    competencies: [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust',
      'Node.js', 'React', 'Vue', 'Angular', 'Next.js', 'Django', 'Flask',
      'Spring Boot', 'REST API', 'GraphQL', 'Microservices', 'Git', 'Docker',
      'Kubernetes', 'AWS', 'Azure', 'Google Cloud', 'CI/CD', 'Terraform',
      'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Linux', 'Unit Testing',
      'SQL', 'Machine Learning', 'NLP', 'LLM',
    ],
    portfolio: {
      label: 'Technical project links',
      hint: 'a GitHub profile, live demo, or deployed case study',
      examples: ['github.com/yourhandle', 'yourhandle.github.io', 'live demo URL'],
    },
    metrics: [
      'p95 latency reduced 40% by adding a cache',
      'shipped a feature used by 30k monthly users',
      'cut page load from 4.2s to 1.1s',
      'reduced deploy time from 45 to 8 minutes',
    ],
    credentials: ['relevant certifications', 'AWS or Azure certification', 'degree in Computer Science or adjacent field'],
  },

  data: {
    label: 'Data, Analytics & Research',
    altLabels: ['Analytics', 'Data Science', 'Research'],
    signals: [
      ['data analyst', 3], ['data scientist', 3], ['business intelligence', 3],
      ['analytics', 2], ['data analysis', 2], ['statistical', 2],
      ['dashboard', 1], ['reporting', 1], ['forecast', 1],
      ['a/b test', 2], ['experiment design', 2], ['kpi', 2],
      ['machine learning', 2], ['data modelling', 2], ['data pipeline', 2],
      ['visualisation', 2], ['visualization', 2], ['insight', 1],
      ['segmentation', 1], ['query', 1], ['metric', 1],
    ],
    titles: [
      'data analyst', 'data scientist', 'business intelligence analyst',
      'bi analyst', 'analytics manager', 'research analyst', 'researcher',
      'statistician', 'insights analyst', 'data engineer', 'quantitative analyst',
    ],
    competencies: [
      'Data Analysis', 'SQL', 'Excel', 'Power BI', 'Tableau', 'Statistics',
      'Pandas', 'NumPy', 'Machine Learning', 'Deep Learning', 'Data Visualization',
      'ETL', 'A/B Testing', 'Apache Spark', 'Python', 'R',
    ],
    portfolio: {
      label: 'Analysis portfolio',
      hint: 'a published report, dashboard, notebook, or case study',
      examples: ['link to a public dashboard', 'GitHub/notebook repository', 'link to a published analysis'],
    },
    metrics: [
      'forecast accuracy improved from 71% to 88%',
      'cut monthly reporting time from 3 days to 4 hours',
      'identified a segment worth $1.2M in annual revenue',
      'increased campaign ROI 24% through experiment testing',
    ],
    credentials: ['data or analytics certification', 'advanced statistics coursework', 'degree in Statistics, Economics or a quantitative field'],
  },

  design: {
    label: 'Design & Creative',
    altLabels: ['UX', 'UI', 'Graphic Design', 'Creative'],
    signals: [
      ['ux designer', 3], ['ui designer', 3], ['graphic designer', 3],
      ['product design', 3], ['user research', 2], ['wireframe', 2],
      ['prototype', 2], ['design system', 2], ['brand', 1],
      ['typography', 2], ['illustration', 2], ['art direction', 2],
      ['accessibility', 1], ['usability testing', 2], ['visual identity', 2],
      ['creative direction', 2], ['layout', 1],
    ],
    titles: [
      'ux designer', 'ui designer', 'product designer', 'graphic designer',
      'visual designer', 'design lead', 'art director', 'brand designer',
      'illustrator', 'creative director', 'interaction designer',
    ],
    competencies: [
      'Figma', 'Photoshop', 'Illustration', 'Design Systems', 'Responsive Design',
      'Accessibility', 'User Research', 'Prototyping', 'Typography', 'Blender',
    ],
    portfolio: {
      label: 'Portfolio',
      hint: 'a visual portfolio with case studies showing process, not just final images',
      examples: ['behance.net/yourname', 'yourname.com portfolio', 'case study write-ups'],
    },
    metrics: [
      'raised checkout conversion 12% after a usability test round',
      'cut design-to-build time by designing a 40-component system',
      'reduced support tickets 18% by simplifying the onboarding flow',
    ],
    credentials: ['design portfolio review', 'relevant design certification', 'degree in Design or a related field'],
  },

  marketing: {
    label: 'Marketing, PR & Communications',
    altLabels: ['Marketing', 'Communications', 'PR', 'Brand Marketing', 'Content'],
    signals: [
      ['marketing manager', 3], ['digital marketing', 3], ['brand manager', 3],
      ['campaign', 2], ['campaigns', 2], ['seo', 2], ['sem', 2],
      ['content strategy', 2], ['social media', 2], ['email marketing', 2],
      ['copywriting', 2], ['public relations', 2], ['press release', 2],
      ['media outreach', 2], ['audience', 1], ['engagement rate', 2],
      ['conversion rate', 2], ['paid media', 2], ['influencer', 1],
      ['newsletter', 1], ['brand awareness', 2], ['launch', 1],
    ],
    titles: [
      'marketing manager', 'marketing director', 'digital marketing specialist',
      'brand manager', 'content strategist', 'copywriter', 'communications manager',
      'public relations manager', 'social media manager', 'growth marketer',
      'product marketing manager', 'demand generation manager',
    ],
    competencies: [
      'SEO', 'Content Strategy', 'Copywriting', 'Google Analytics',
      'Paid Media', 'CRM', 'Email Marketing', 'Social Media Marketing',
      'Public Relations', 'Market Research', 'Campaign Management', 'A/B Testing',
    ],
    portfolio: {
      label: 'Campaign portfolio',
      hint: 'case studies with the brief, the result, and the metric',
      examples: ['links to campaigns you ran', 'a personal blog or newsletter', 'a spec ad or content sample'],
    },
    metrics: [
      'grew organic traffic 140% in 9 months',
      'launched a campaign that generated 3,200 sign-ups at £22 CPA',
      'lifted email open rate from 18% to 34% through segmentation',
      'secured 14 pieces of national press coverage',
    ],
    credentials: ['Google/Meta certified', 'CIM or equivalent marketing qualification', 'degree in Marketing or Communications'],
  },

  sales: {
    label: 'Sales, Business Development & Account Management',
    altLabels: ['Sales', 'Business Development', 'BD', 'Account Management'],
    signals: [
      ['sales manager', 3], ['account executive', 3], ['business development', 3],
      ['sales representative', 3], ['quota', 3], ['pipeline', 2],
      ['deal', 1], ['deals', 1], ['prospect', 2], ['cold calling', 2],
      ['negotiation', 2], ['contract', 1], ['renewal', 2],
      ['upsell', 2], ['cross-sell', 2], ['crm', 2], ['revenue', 1],
      ['close rate', 2], ['lead generation', 2], ['territory', 1],
    ],
    titles: [
      'sales manager', 'sales director', 'account executive', 'account manager',
      'business development manager', 'sales representative', 'regional sales manager',
      'inside sales representative', 'commercial manager', 'partnerships manager',
    ],
    competencies: [
      'Negotiation', 'Sales Pipeline Management', 'CRM', 'Lead Generation',
      'Cold Outreach', 'Account Management', 'Forecasting', 'Objection Handling',
      'Closing', 'Key Account Management', 'Customer Retention',
    ],
    portfolio: {
      label: 'Track record',
      hint: 'quota attainment and revenue figures — in sales, numbers ARE the portfolio',
      examples: ['quota attainment %', 'ARR or revenue closed', 'pipeline you created'],
    },
    metrics: [
      'exceeded quota 128% for four consecutive quarters',
      'closed £2.4M in new business in year one',
      'grew an account from £80k to £310k in ARR',
      'reduced churn 22% by restructuring the renewal process',
    ],
    credentials: ['sales or business development certification', 'negotiation training', 'degree in any discipline'],
  },

  finance: {
    label: 'Finance, Investment & Risk',
    altLabels: ['Finance', 'Financial Services', 'Banking', 'Investment', 'Risk'],
    signals: [
      ['financial analyst', 3], ['finance manager', 3], ['investment banker', 3],
      ['chartered accountant', 3], ['cfo', 3], ['treasury', 3],
      ['valuation', 2], ['portfolio management', 2], ['risk management', 2],
      ['audit', 2], ['budgeting', 2], ['forecasting', 2],
      ['revenue recognition', 2], ['capital expenditure', 2],
      ['due diligence', 2], ['cash flow', 2], ['financial statements', 2],
      ['credit', 1], ['actuarial', 3],
    ],
    titles: [
      'financial analyst', 'finance manager', 'financial controller',
      'accountant', 'investment banker', 'portfolio manager', 'treasurer',
      'risk analyst', 'auditor', 'tax advisor', 'chief financial officer',
      'credit analyst', 'actuary', 'management accountant',
    ],
    competencies: [
      'Financial Modelling', 'Financial Reporting', 'Budgeting', 'Forecasting',
      'IFRS', 'Audit', 'Risk Management', 'Investment Analysis', 'Excel',
      'Cash Flow Management', 'Taxation', 'Valuation', 'Regulatory Compliance',
    ],
    portfolio: {
      label: 'Professional credentials & track record',
      hint: 'a recognised qualification plus evidence of financial scope you have owned',
      examples: ['ACCA / CIMA / CPA membership', 'scope of budgets you owned', 'notable transactions you supported'],
    },
    metrics: [
      'reduced annual operating costs £1.8M through spend analysis',
      'delivered a 3-year financial model supporting a £40M raise',
      'improved forecast accuracy from ±18% to ±4%',
      'zero material audit findings across three years',
    ],
    credentials: ['ACCA, CIMA, CPA or equivalent professional membership', 'regulatory registration', 'degree in Finance, Accounting or Economics'],
  },

  accounting: {
    label: 'Accounting & Bookkeeping',
    altLabels: ['Accounting', 'Bookkeeping', 'Payroll', 'Tax'],
    signals: [
      ['accountant', 3], ['bookkeeper', 3], ['accounts', 2],
      ['trial balance', 3], ['general ledger', 3], ['reconciliation', 3],
      ['payroll', 2], ['vat', 3], ['tax return', 3],
      ['financial reporting', 2], ['debit', 2], ['credit', 1],
      ['gaap', 2], ['ifrs', 2], ['sage', 2], ['xero', 2], ['quickbooks', 2],
      ['taxation', 2], ['year end', 2],
    ],
    titles: [
      'accountant', 'senior accountant', 'bookkeeper', 'accounts assistant',
      'financial controller', 'tax accountant', 'payroll manager',
      'auditor', 'finance administrator', 'accounts payable clerk',
    ],
    competencies: [
      'Financial Reporting', 'Bookkeeping', 'Taxation', 'Payroll', 'Audit',
      'VAT', 'IFRS', 'Excel', 'Reconciliation', 'Accounts Payable',
      'Accounts Receivable', 'Financial Modelling',
    ],
    portfolio: {
      label: 'Qualification & systems experience',
      hint: 'your professional grade and the accounting software and standards you work in',
      examples: ['ACCA / AAT / CIMA grade', 'Sage / Xero / QuickBooks experience', 'number of ledgers you own'],
    },
    metrics: [
      'cleaned a 3-year backlog of unreconciled accounts',
      'reduced month-end close from 10 days to 4',
      'handled a £12M annual payroll with zero errors',
      'identified £340k in unclaimed tax reliefs',
    ],
    credentials: ['ACCA, AAT, ICAEW or CIMA membership', 'Sage / Xero / QuickBooks certification', 'degree in Accounting or Finance'],
  },

  healthcare: {
    label: 'Healthcare, Clinical & Allied Health',
    altLabels: ['Healthcare', 'Clinical', 'Medical', 'Nursing', 'Allied Health'],
    signals: [
      ['registered nurse', 3], ['nurse', 2], ['physician', 3], ['doctor', 3],
      ['clinical', 3], ['patient', 2], ['patients', 2], ['ward', 3],
      ['diagnosis', 2], ['diagnosis', 2], ['triage', 3], ['icu', 3],
      ['emergency department', 3], ['surgery', 2], ['pharmacy', 3],
      ['therapy', 2], ['physiotherapy', 3], ['dentistry', 3], ['dental', 3],
      ['radiology', 3], ['midwifery', 3], ['paramedic', 3],
      ['care plan', 2], ['clinical trial', 2], ['patient safety', 2],
    ],
    titles: [
      'registered nurse', 'nurse practitioner', 'doctor', 'physician',
      'consultant', 'clinical pharmacist', 'physiotherapist', 'occupational therapist',
      'midwife', 'paramedic', 'dentist', 'radiographer', 'dietitian',
      'social worker', 'clinical scientist', 'healthcare assistant',
    ],
    competencies: [
      'Patient Care', 'Clinical Assessment', 'Care Planning', 'Clinical Documentation',
      'Patient Safety', 'Infection Control', 'Triage', 'Medication Administration',
      'Interdisciplinary Collaboration', 'Evidence-Based Practice', 'Compassionate Care',
    ],
    portfolio: {
      label: 'Registration & specialist credentials',
      hint: 'your professional registration number, scope of practice, and any specialist training',
      examples: ['NMC / GMC / HCPC registration number', 'specialist courses or credentials', 'referee or supervisor details'],
    },
    metrics: [
      'reduced ward handover incidents 30% with a new checklist',
      'managed a caseload of 40 patients with 100% medication accuracy',
      'led a clinic seeing 25 patients a day with reduced no-shows',
      'cut average waiting times 18% through triage redesign',
    ],
    credentials: ['professional body registration (NMC, GMC, HCPC)', 'mandatory revalidation', 'specialist or postgraduate qualification'],
  },

  education: {
    label: 'Teaching, Academia & Training',
    altLabels: ['Teaching', 'Education', 'Academic', 'Faculty'],
    signals: [
      ['teacher', 3], ['teaching assistant', 3], ['lecturer', 3],
      ['professor', 3], ['classroom', 3], ['curriculum', 3],
      ['lesson plan', 3], ['lesson planning', 3], ['pupil', 3],
      ['student', 2], ['students', 2], ['grading', 2], ['pedagogy', 3],
      ['head of department', 3], ['school', 2], ['undergraduate', 1],
      ['tutor', 2], ['supervision', 1], ['higher education', 2],
      ['class size', 2], ['attainment', 2],
    ],
    titles: [
      'teacher', 'teaching assistant', 'headteacher', 'head of department',
      'lecturer', 'professor', 'tutor', 'head of year', 'school counsellor',
      'curriculum developer', 'education officer', 'trainer',
    ],
    competencies: [
      'Lesson Planning', 'Classroom Management', 'Curriculum Development',
      'Assessment', 'Differentiation', 'Behaviour Management', 'Pedagogy',
      'Student Engagement', 'Parent Engagement', 'Grading & Feedback',
      'Educational Technology', 'Safeguarding',
    ],
    portfolio: {
      label: 'Teaching evidence',
      hint: 'a teaching philosophy, inspected or peer-reviewed results, and resources you have created',
      examples: ['teaching resources you authored', 'class results or progress data', 'a professional development portfolio'],
    },
    metrics: [
      'raised department attainment 14% over two years',
      'designed a curriculum adopted by 6 schools',
      'improved student attendance from 88% to 96%',
      'mentored 8 new teachers through to full registration',
    ],
    credentials: ['teaching registration / QTS or equivalent', 'subject specialism accreditation', 'safeguarding and first aid certification'],
  },

  legal: {
    label: 'Legal, Compliance & Governance',
    altLabels: ['Legal', 'Law', 'Compliance', 'Governance'],
    signals: [
      ['lawyer', 3], ['solicitor', 3], ['attorney', 3], ['barrister', 3],
      ['paralegal', 3], ['legal counsel', 3], ['litigation', 3],
      ['contract law', 3], ['compliance', 2], ['regulatory', 2],
      ['due diligence', 2], ['negotiation', 1], ['case management', 2],
      ['statute', 3], ['legislation', 3], ['gdpr', 2], ['policy drafting', 2],
    ],
    titles: [
      'lawyer', 'solicitor', 'attorney', 'barrister', 'paralegal',
      'legal counsel', 'compliance officer', 'general counsel',
      'contract manager', 'risk and compliance manager', 'policy adviser',
    ],
    competencies: [
      'Legal Research', 'Contract Drafting', 'Negotiation', 'Regulatory Compliance',
      'Data Protection', 'Policy Development', 'Litigation Support',
      'Corporate Governance', 'Due Diligence', 'Risk Assessment',
      'Stakeholder Advice', 'Documentation',
    ],
    portfolio: {
      label: 'Professional standing',
      hint: 'your regulatory body registration and the matters or policy you have led',
      examples: ['bar / law society registration', 'notable matters worked on', 'published legal commentary'],
    },
    metrics: [
      'led 60+ contract reviews with zero post-signature disputes',
      'reduced regulatory findings 40% after a policy overhaul',
      'negotiated a supply agreement protecting $8M in liability',
    ],
    credentials: ['bar admission or law society membership', 'legal practice qualification', 'specialist accreditation'],
  },

  human_resources: {
    label: 'Human Resources & People',
    altLabels: ['HR', 'People', 'Recruiting', 'Talent'],
    signals: [
      ['human resources', 3], ['hr manager', 3], ['hr business partner', 3],
      ['recruiter', 3], ['talent acquisition', 3], ['recruitment', 2],
      ['onboarding', 2], ['performance review', 2], ['appraisal', 2],
      ['employee relations', 3], ['payroll', 2], ['headcount', 2],
      ['workforce planning', 3], ['compensation', 1], ['culture', 1],
      ['l&d', 2], ['learning and development', 2], ['absence', 1],
    ],
    titles: [
      'human resources manager', 'hr business partner', 'recruiter',
      'talent acquisition specialist', 'people operations lead', 'hr director',
      'learning and development manager', 'employee relations adviser',
      'compensation analyst', 'chief people officer',
    ],
    competencies: [
      'Recruiting', 'Talent Acquisition', 'Employee Relations', 'Onboarding',
      'Performance Management', 'Compensation & Benefits', 'Workforce Planning',
      'Employment Law', 'HRIS', 'Learning & Development', 'Policy Development',
    ],
    portfolio: {
      label: 'People programme outcomes',
      hint: 'headcount you have supported, hiring volume you own, and policy you have written',
      examples: ['roles recruited per quarter', 'engagement or retention improvements', 'HR policies authored'],
    },
    metrics: [
      'filled 85 open roles in 6 months with a 21-day average time-to-hire',
      'cut voluntary attrition 25% after an engagement programme',
      'launched a diversity hiring scheme that lifted diverse hires to 38%',
    ],
    credentials: ['CIPD, SHRM or equivalent', 'employment law qualification', 'professional HR body membership'],
  },

  operations: {
    label: 'Operations, Supply Chain & Project Management',
    altLabels: ['Operations', 'Supply Chain', 'Logistics', 'Project Management'],
    signals: [
      ['operations manager', 3], ['supply chain', 3], ['logistics', 3],
      ['project manager', 3], ['programme manager', 3], ['procurement', 3],
      ['inventory', 2], ['warehouse', 2], ['forecasting', 2],
      ['process improvement', 2], ['lean', 2], ['six sigma', 3],
      ['stakeholder', 2], ['gantt', 2], ['milestone', 2], ['delivery', 1],
      ['sourcing', 2], ['vendor', 1], ['budget', 1],
    ],
    titles: [
      'operations manager', 'operations director', 'supply chain manager',
      'logistics manager', 'project manager', 'programme manager',
      'procurement manager', 'plant manager', 'facilities manager',
      'continuous improvement lead', 'scrum master', 'product owner',
    ],
    competencies: [
      'Project Management', 'Process Improvement', 'Supply Chain Management',
      'Procurement', 'Forecasting', 'Vendor Management', 'Lean Six Sigma',
      'Budgeting', 'Stakeholder Management', 'Capacity Planning',
      'Change Management', 'Risk Management',
    ],
    portfolio: {
      label: 'Delivery evidence',
      hint: 'projects you delivered, budgets you owned, and the process changes you implemented',
      examples: ['project case studies', 'budget or cost-savings figures', 'process improvement results'],
    },
    metrics: [
      'delivered a £1.2M programme 6 weeks ahead of schedule',
      'cut order fulfilment time 32% through a revised process',
      'reduced stock holding costs £400k with demand forecasting',
    ],
    credentials: ['PMP, PRINCE2 or APM qualification', 'Lean Six Sigma certification', 'degree in Operations, Business or Engineering'],
  },

  engineering_manufacturing: {
    label: 'Engineering, Manufacturing & Trades',
    altLabels: ['Engineering', 'Manufacturing', 'Mechanical', 'Civil'],
    signals: [
      ['engineer', 2], ['manufacturing', 3], ['mechanical engineer', 3],
      ['civil engineer', 3], ['structural', 3], ['production', 2],
      ['cad', 2], ['solidworks', 3], ['autocad', 3], ['quality assurance', 2],
      ['iso 9001', 2], ['maintenance', 2], ['plant', 1],
      ['machining', 3], ['welding', 3], ['electrician', 3], ['hvac', 3],
      ['construction', 2], ['site management', 2], ['safety', 1],
    ],
    titles: [
      'mechanical engineer', 'civil engineer', 'structural engineer',
      'manufacturing engineer', 'production manager', 'quality engineer',
      'site manager', 'construction manager', 'maintenance engineer',
      'electrician', 'welder', 'hvac engineer', 'process engineer',
      'plant manager', 'estimator', 'quantity surveyor',
    ],
    competencies: [
      'CAD', 'Quality Assurance', 'Project Management', 'Maintenance',
      'Lean Manufacturing', 'ISO Standards', 'Health & Safety', 'Root Cause Analysis',
      'Process Design', 'Cost Estimation', 'Regulatory Compliance', 'Troubleshooting',
    ],
    portfolio: {
      label: 'Technical & safety credentials',
      hint: 'your chartered or certified status, licences, and the builds or processes you have delivered',
      examples: ['CEng / IEng registration', 'site photos or build documentation', 'safety certification'],
    },
    metrics: [
      'reduced unplanned downtime 28% through a preventive maintenance programme',
      'delivered a plant expansion £600k under budget',
      'cut manufacturing scrap 19% by tightening incoming QC',
    ],
    credentials: ['CEng, IEng or licensed trade registration', 'NEBOSH or IOSH safety qualification', 'relevant professional membership'],
  },

  customer_service: {
    label: 'Customer Experience & Support',
    altLabels: ['Customer Service', 'Support', 'Contact Centre', 'CX'],
    signals: [
      ['customer service', 3], ['customer support', 3], ['customer experience', 3],
      ['help desk', 3], ['service desk', 3], ['contact centre', 3],
      ['call centre', 3], ['ticketing', 2], ['ticket', 1],
      ['sla', 3], ['csat', 3], ['nps', 3], ['first contact resolution', 3],
      ['complaint', 1], ['escalation', 2], ['customer satisfaction', 2],
    ],
    titles: [
      'customer service representative', 'customer success manager',
      'support engineer', 'help desk analyst', 'service desk manager',
      'contact centre manager', 'client services manager', 'account support lead',
    ],
    competencies: [
      'Customer Service', 'Conflict Resolution', 'Ticketing Systems',
      'CRM', 'Escalation Management', 'SLA Management', 'Customer Satisfaction',
      'Active Listening', 'Problem Solving', 'Process Documentation', 'Quality Assurance',
    ],
    portfolio: {
      label: 'Performance record',
      hint: 'your CSAT, SLA attainment, and resolution metrics — in support, the numbers are the CV',
      examples: ['average CSAT', 'SLA attainment %', 'first-contact resolution rate'],
    },
    metrics: [
      'maintained a 96% CSAT across 5,000+ tickets',
      'cut first-contact resolution 24% with a new knowledge base',
      'led a team of 12 to 98% SLA attainment',
    ],
    credentials: ['customer service certification', 'product or platform specialism', 'ITIL or service-management qualification'],
  },

  hospitality: {
    label: 'Hospitality, Travel & Events',
    altLabels: ['Hospitality', 'Hotel', 'Restaurant', 'Events', 'Travel'],
    signals: [
      ['hotel', 3], ['restaurant', 3], ['hospitality', 3], ['chef', 3],
      ['sous chef', 3], ['front of house', 3], ['barista', 3],
      ['catering', 3], ['waiter', 3], ['waitress', 3], ['host', 1],
      ['housekeeping', 3], ['concierge', 3], ['travel agent', 3],
      ['event management', 3], ['banquet', 3], ['guest experience', 2],
      ['food safety', 2], ['menu', 1], ['reservation', 1],
    ],
    titles: [
      'chef', 'head chef', 'sous chef', 'restaurant manager', 'hotel manager',
      'front of house manager', 'bar manager', 'catering manager', 'event manager',
      'sous chef', 'pastry chef', 'travel consultant', 'housekeeping supervisor',
    ],
    competencies: [
      'Food Safety', 'Menu Planning', 'Customer Service', 'Team Leadership',
      'Inventory Management', 'HACCP', 'Event Coordination', 'Cost Control',
      'Wine Service', 'Housekeeping Operations', 'Supplier Negotiation',
    ],
    portfolio: {
      label: 'Operational & culinary record',
      hint: 'venue or kitchen you have run, covers served, and the standards you have held',
      examples: ['venue you managed', 'covers/events per service', 'awards or accreditations'],
    },
    metrics: [
      'maintained a 4.7 review score across 2,000 covers a month',
      'cut food cost 8% without affecting guest satisfaction',
      'ran 12 weddings totalling 900 guests with zero incidents',
    ],
    credentials: ['food safety Level 2/3 certification', 'personal licence or hospitality award', 'HACCP training'],
  },

  retail: {
    label: 'Retail, E-commerce & Customer Sales',
    altLabels: ['Retail', 'E-commerce', 'Store Operations'],
    signals: [
      ['retail', 3], ['store manager', 3], ['shop assistant', 3],
      ['e-commerce', 3], ['ecommerce', 3], ['merchandising', 2],
      ['visual merchandising', 3], ['stock control', 2], ['pos', 1],
      ['b2c', 1], ['footfall', 2], ['conversion rate', 2], ['upsell', 2],
      ['cash handling', 2], ['customer service', 1], ['store operations', 3],
    ],
    titles: [
      'retail manager', 'store manager', 'shop assistant', 'sales assistant',
      'merchandiser', 'e-commerce manager', 'assistant manager', 'store supervisor',
      'category manager', 'visual merchandiser',
    ],
    competencies: [
      'Retail Operations', 'Customer Service', 'Merchandising', 'Sales',
      'Stock Control', 'Visual Merchandising', 'Team Leadership',
      'Upselling', 'Inventory Management', 'POS Systems',
    ],
    portfolio: {
      label: 'Sales performance',
      hint: 'the numbers you have been measured on — sales against target, and store-level KPIs',
      examples: ['sales vs target %', 'store conversion', 'upsell or basket figures'],
    },
    metrics: [
      'exceeded sales target 112% for 14 consecutive months',
      'lifted store conversion 19% through a revised layout',
      'reduced stock loss 30% with a new replenishment routine',
    ],
    credentials: ['retail or customer service training', 'management development programme', 'product category knowledge'],
  },

  media: {
    label: 'Media, Entertainment & Communications',
    altLabels: ['Media', 'Journalism', 'Film', 'Writing', 'Publishing'],
    signals: [
      ['journalist', 3], ['editor', 2], ['reporter', 3], ['newsroom', 3],
      ['publishing', 3], ['producer', 2], ['filmmaker', 3],
      ['screenwriter', 3], ['podcast', 2], ['broadcaster', 3],
      ['photographer', 3], ['video production', 3], ['editing', 1],
      ['byline', 2], ['press', 1], ['interview', 1],
    ],
    titles: [
      'journalist', 'news reporter', 'editor', 'producer', 'director',
      'screenwriter', 'photographer', 'content producer', 'presenter',
      'podcast host', 'video editor', 'copy editor', 'writer',
    ],
    competencies: [
      'Writing', 'Editing', 'Interviewing', 'Storytelling', 'Research',
      'Fact Checking', 'Production', 'Publishing', 'Audience Understanding',
      'Media Relations', 'Scriptwriting', 'Copy Editing',
    ],
    portfolio: {
      label: 'Published work',
      hint: 'clips, bylines, published pieces, or a showreel — the work is the credential',
      examples: ['published articles with links', 'showreel or demo reel', 'broadcast credits'],
    },
    metrics: [
      'wrote 40 published pieces averaging 25k reads',
      'grew a podcast to 15,000 monthly listeners',
      'produced a series that reached 400k views',
    ],
    credentials: ['editorial or industry accreditation', 'union membership', 'degree in Media, Journalism or Communications'],
  },

  research: {
    label: 'Scientific Research & Laboratory',
    altLabels: ['Research', 'Science', 'Laboratory', 'Academic Research'],
    signals: [
      ['researcher', 3], ['research scientist', 3], ['laboratory', 3],
      ['postdoctoral', 3], ['phd', 2], ['principal investigator', 3],
      ['experiment', 2], ['peer review', 2], ['publication', 2],
      ['grant', 2], ['methodology', 1], ['clinical trial', 2],
      ['assay', 2], ['protocol', 1], ['scientific', 2],
    ],
    titles: [
      'research scientist', 'research fellow', 'postdoctoral researcher',
      'principal investigator', 'laboratory manager', 'clinical research associate',
      'research assistant', 'professor', 'research director', 'bioinformatician',
    ],
    competencies: [
      'Research Design', 'Data Analysis', 'Methodology', 'Scientific Writing',
      'Grant Writing', 'Peer Review', 'Laboratory Techniques', 'Statistical Analysis',
      'Project Management', 'Ethics & Compliance', 'Publication', 'Collaboration',
    ],
    portfolio: {
      label: 'Research record',
      hint: 'publications, preprints, and the projects or grants you have led',
      examples: ['DOI or publication list', 'preprint links', 'grant awards'],
    },
    metrics: [
      'published 8 peer-reviewed papers, 3 as first author',
      'secured £450k in grant funding',
      'reduced assay turnaround 40% by redesigning the protocol',
    ],
    credentials: ['postgraduate degree (MSc/PhD)', 'institutional ethics approval', 'specialist technical accreditation'],
  },

  general: {
    label: 'General Professional',
    altLabels: ['Professional', 'Other'],
    signals: [],
    titles: [],
    competencies: [
      'Communication', 'Leadership', 'Problem Solving', 'Teamwork',
      'Project Management', 'Adaptability', 'Time Management', 'Collaboration',
    ],
    portfolio: {
      label: 'Evidence of your work',
      hint: 'a portfolio, LinkedIn profile, or a short written case study of work you are proud of',
      examples: ['LinkedIn profile', 'a one-page case study', 'a portfolio or personal site'],
    },
    metrics: [
      'delivered a key project 3 weeks ahead of schedule',
      'reduced team turnaround time 25% by streamlining handovers',
      'led a cross-team initiative with 6 stakeholder groups',
    ],
    credentials: ['a relevant professional qualification', 'industry-recognised certification', 'a degree or equivalent in your discipline'],
  },
};

/** Fields that require a regulated licence — advice must never contradict it. */
const REGULATED_FIELDS = new Set(['healthcare', 'legal', 'education', 'accounting', 'finance']);

/**
 * Skills that are generic to office work and therefore prove nothing about
 * industry. Excluded from competency evidence so a CV with no real field
 * signals cannot be confidently misclassified.
 */
const UNIVERSAL_SKILL_NAMES = new Set([
  'leadership',
  'communication',
  'problem solving',
  'teamwork',
  'project management',
  'adaptability',
  'time management',
  'collaboration',
  'attention to detail',
  'decision making',
  'customer focus',
  'report writing',
  'administration',
  'mentoring',
  'coaching',
  'presentation',
  'presenting',
  'cross-functional',
  'stakeholder management',
  'budgeting',
  'forecasting',
  'leadership',
]);

/**
 * Weighted word-boundary-safe regex source for a term. Multi-word terms and
 * terms containing punctuation (. + /) need escaping before the boundaries.
 */
const termSource = (term) => {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return `(?<![a-z0-9])${escaped}(?![a-z0-9])`;
};

const countHits = (haystack, term) => {
  const re = new RegExp(termSource(term), 'gi');
  return (haystack.match(re) || []).length;
};

/**
 * Detect the candidate's field from their CV.
 *
 * Titles are weighted far more heavily than body keywords because job titles
 * are the single most reliable field signal a CV carries. Competency hits break
 * ties between fields that share vocabulary (a nurse and a lab scientist both
 * say "research").
 *
 * @param {string} text Full extracted CV text.
 * @param {object} [opts]
 * @param {Array<{name: string}>} [opts.skills] Extracted skills, used as
 *   competency evidence.
 * @param {Array<{title?: string, company?: string}>} [opts.experience]
 *   Parsed experience entries, used for title evidence.
 * @returns {{
 *   field: string,
 *   label: string,
 *   confidence: number,
 *   evidence: string[],
 *   alternatives: Array<{field: string, label: string, score: number}>
 * }}
 */
const detectField = (text = '', opts = {}) => {
  const lower = String(text).toLowerCase();
  const { skills = [], experience = [] } = opts;

  const skillNames = new Set(
    (Array.isArray(skills) ? skills : [])
      .map((s) => (typeof s === 'string' ? s : s?.name))
      .filter(Boolean)
      .map((s) => String(s).toLowerCase())
  );

  const titles = (Array.isArray(experience) ? experience : [])
    .map((e) => `${e?.title || ''} ${e?.company || ''}`)
    .join(' \n ')
    .toLowerCase();

  const scores = new Map();
  const evidence = new Map();

  const add = (key, amount, reason) => {
    scores.set(key, (scores.get(key) || 0) + amount);
    if (reason) {
      const list = evidence.get(key) || [];
      if (list.length < 5) list.push(reason);
      evidence.set(key, list);
    }
  };

  for (const [key, field] of Object.entries(FIELDS)) {
    if (key === 'general') continue;

    // 1. Job titles — strongest signal.
    for (const title of field.titles) {
      const hits = countHits(titles, title);
      if (hits) add(key, hits * 12, `job title "${title}"`);
    }

    // 2. Field keywords anywhere in the CV.
    for (const [term, weight] of field.signals) {
      const hits = countHits(lower, term);
      if (hits) add(key, Math.min(hits, 3) * weight, term);
    }

    // 3. Competencies — hard evidence, and a tie-breaker.
    //
    //    Transferable soft skills are deliberately excluded here. "Problem
    //    Solving" is a competency of half the fields, so scoring it would let
    //    a CV with no industry content at all be confidently classified as
    //    customer service. Only field-specific competencies count.
    for (const competency of field.competencies) {
      if (UNIVERSAL_SKILL_NAMES.has(competency.toLowerCase())) continue;
      if (skillNames.has(competency.toLowerCase())) {
        add(key, 5, `${competency} (skill)`);
      }
    }
  }

  if (!scores.size) {
    return {
      field: 'general',
      label: FIELDS.general.label,
      confidence: 0,
      evidence: [],
      alternatives: [],
    };
  }

  const ranked = [...scores.entries()]
    .map(([field, score]) => ({
      field,
      label: FIELDS[field].label,
      score: Math.round(score),
      evidence: evidence.get(field) || [],
    }))
    .sort((a, b) => b.score - a.score);

  const [top, second] = ranked;

  // Confidence blends absolute signal strength with how far clear of the
  // runner-up the winner is. A single weak keyword match is low confidence;
  // a clear title plus competencies is high.
  const strength = Math.min(top.score / 45, 1);
  const separation = second ? Math.min((top.score - second.score) / Math.max(top.score, 1), 1) : 1;
  const confidence = Math.round((strength * 0.6 + separation * 0.4) * 100);

  return {
    field: top.field,
    label: top.label,
    confidence,
    evidence: top.evidence,
    alternatives: ranked.slice(1, 4),
  };
};

/** @returns {object} the profile for a field, falling back to `general`. */
const getFieldProfile = (key) => FIELDS[key] || FIELDS.general;

/** @returns {boolean} whether the field requires a regulated licence. */
const isRegulated = (key) => REGULATED_FIELDS.has(key);

module.exports = {
  FIELDS,
  detectField,
  getFieldProfile,
  isRegulated,
  REGULATED_FIELDS,
};
