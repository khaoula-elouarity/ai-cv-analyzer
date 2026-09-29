/**
 * Curated skill taxonomy used by the deterministic local analyser.
 * Weight reflects how strongly the skill influences shortlisting decisions.
 */
const SKILL_TAXONOMY = {
  /* ---------------------------------------------------------------- tech -- */
  Languages: [
    ['JavaScript', 3], ['TypeScript', 4], ['Python', 4], ['Java', 3], ['C#', 3],
    ['C++', 3], ['Go', 3], ['Rust', 3], ['Ruby', 2], ['PHP', 2], ['Swift', 3],
    ['Kotlin', 3], ['Dart', 2], ['R', 1], ['MATLAB', 1], ['Scala', 1], ['Perl', 1],
    ['Bash', 2], ['SQL', 3], ['HTML', 2], ['CSS', 2], ['Solidity', 2],
  ],
  Frontend: [
    ['React', 4], ['Next.js', 3], ['Vue', 3], ['Angular', 3], ['Svelte', 3],
    ['Redux', 2], ['TypeScript', 3], ['Tailwind CSS', 2], ['TailwindCSS', 2],
    ['Styled Components', 2], ['Material UI', 2], ['Vite', 2], ['Webpack', 2],
    ['NextJS', 3], ['GraphQL', 3], ['Apollo', 2], ['React Native', 3],
    ['Framer Motion', 1], ['jQuery', 1], ['HTML5', 2], ['CSS3', 2],
    ['Responsive Design', 1], ['Accessibility', 1], ['Storybook', 1],
  ],
  Backend: [
    ['Node.js', 4], ['Express', 3], ['NestJS', 3], ['Django', 3], ['Flask', 3],
    ['FastAPI', 3], ['Spring Boot', 3], ['GraphQL', 3], ['REST API', 3],
    ['REST APIs', 3], ['gRPC', 2], ['Microservices', 3], ['tRPC', 2],
    ['Laravel', 2], ['Rails', 2], ['.NET', 3], ['Socket.io', 2],
  ],
  Database: [
    ['MongoDB', 4], ['PostgreSQL', 4], ['MySQL', 3], ['SQLite', 1], ['Redis', 3],
    ['Elasticsearch', 2], ['Cassandra', 1], ['DynamoDB', 2], ['Firebase', 3],
    ['Firestore', 2], ['Supabase', 2], ['Prisma', 2], ['Mongoose', 3],
    ['SQL Server', 2], ['Oracle', 2], ['Neo4j', 1], ['Snowflake', 2],
  ],
  Cloud: [
    ['AWS', 4], ['Azure', 3], ['Google Cloud', 3], ['GCP', 3], ['Docker', 3],
    ['Kubernetes', 3], ['Terraform', 3], ['CI/CD', 3], ['GitHub Actions', 2],
    ['Jenkins', 2], ['Netlify', 2], ['Vercel', 2], ['Heroku', 1],
    ['Serverless', 2], ['Nginx', 1], ['Linux', 2], ['Ansible', 1],
  ],
  Data: [
    ['Machine Learning', 4], ['Deep Learning', 4], ['TensorFlow', 3], ['PyTorch', 4],
    ['scikit-learn', 3], ['Pandas', 3], ['NumPy', 2], ['Data Analysis', 3],
    ['Power BI', 2], ['Tableau', 2], ['Excel', 2], ['ETL', 2], ['Apache Spark', 3],
    ['Airflow', 2], ['dbt', 2], ['LLM', 3], ['NLP', 3], ['LangChain', 2],
    ['OpenCV', 2], ['Data Visualization', 2], ['A/B Testing', 2], ['Statistics', 2],
    ['Apache Kafka', 3], ['Kafka', 3],
  ],
  Security: [
    ['OAuth', 2], ['JWT', 2], ['Authentication', 2], ['Authorization', 2],
    ['Penetration Testing', 2], ['OWASP', 2], ['Encryption', 2], ['Security', 2],
    ['SOC 2', 1], ['GDPR', 1], ['Cyber Security', 3], ['Risk Assessment', 2],
    ['Data Protection', 2], ['Incident Response', 2],
  ],
  Mobile: [
    ['React Native', 3], ['Flutter', 3], ['Swift', 2], ['iOS', 2], ['Android', 2],
    ['Kotlin', 2], ['Expo', 1], ['Jetpack Compose', 1],
  ],
  Testing: [
    ['Jest', 2], ['Cypress', 2], ['Playwright', 2], ['Selenium', 2],
    ['Unit Testing', 2], ['TDD', 2], ['Vitest', 1], ['Jasmine', 1],
    ['End-to-end Testing', 1], ['Testing Library', 1],
  ],
  Design: [
    ['Figma', 3], ['Photoshop', 2], ['Illustrator', 2], ['Blender', 1],
    ['Design Systems', 3], ['User Research', 3], ['Prototyping', 2],
    ['Typography', 2], ['Visual Merchandising', 2], ['Wireframing', 2],
    [    'Usability Testing', 2], ['Accessibility', 2], ['Web Analytics', 2],
    ['Illustration', 2],
  ],

  /* ------------------------------------------------ marketing & comms -- */
  Marketing: [
    ['SEO', 4], ['SEM', 3], ['Content Strategy', 3], ['Copywriting', 3],
    ['Google Analytics', 3], ['Paid Media', 3], ['CRM', 2], ['Email Marketing', 3],
    ['Social Media Marketing', 3], ['Public Relations', 3], ['Market Research', 2],
    ['Campaign Management', 3], ['Conversion Rate', 2], ['Brand Strategy', 3],
    ['A/B Testing', 2], ['Demand Generation', 3], ['Influencer Marketing', 1],
    ['Web Analytics', 2], ['Press Release', 2], ['Audience Segmentation', 2],
  ],
  Media: [
    ['Writing', 2], ['Editing', 2], ['Interviewing', 2], ['Storytelling', 2],
    ['Fact Checking', 2], ['Copy Editing', 2], ['Publishing', 2],
    ['Scriptwriting', 2], ['Media Relations', 2], ['Broadcasting', 3],
    ['Photography', 2], ['Video Production', 3], ['Audience Understanding', 2],
    ['Research', 2], ['Production', 2],
  ],

  /* ------------------------------------------------- sales & commercial -- */
  Sales: [
    ['Negotiation', 3], ['Sales Pipeline Management', 3], ['Lead Generation', 3],
    ['Account Management', 3], ['Forecasting', 2], ['Closing', 3],
    ['Cold Outreach', 2], ['Objection Handling', 3], ['Key Account Management', 3],
    ['Customer Retention', 2], ['Upselling', 2], ['Cross-selling', 2],
    ['Partnerships', 2], ['Commercial Awareness', 2], ['Deal Desk', 1],
  ],
  Retail: [
    ['Retail Operations', 3], ['Merchandising', 3], ['Stock Control', 2],
    ['Visual Merchandising', 3], ['POS Systems', 2], ['Inventory Management', 2],
    ['Store Operations', 3], ['Category Management', 2], ['Shop Floor Management', 2],
  ],

  /* -------------------------------------------------- finance & accounts -- */
  Finance: [
    ['Financial Modelling', 4], ['Financial Reporting', 4], ['Budgeting', 3],
    ['Forecasting', 2], ['IFRS', 3], ['Audit', 3], ['Risk Management', 3],
    ['Investment Analysis', 3], ['Cash Flow Management', 3], ['Taxation', 3],
    ['Valuation', 2], ['Regulatory Compliance', 2], ['Due Diligence', 2],
    ['Financial Statements', 3], ['Cost Control', 2], ['Variance Analysis', 2],
    ['GAAP', 2], ['Management Accounting', 3],
  ],
  Accounting: [
    ['Bookkeeping', 3], ['Reconciliation', 3], ['Payroll', 3], ['VAT', 3],
    ['Tax Return', 3], ['Accounts Payable', 2], ['Accounts Receivable', 2],
    ['Sage', 2], ['Xero', 2], ['QuickBooks', 2], ['Year End', 2],
    ['Trial Balance', 2], ['General Ledger', 2],
  ],

  /* ----------------------------------------------------- health & care -- */
  Healthcare: [
    ['Patient Care', 4], ['Clinical Assessment', 3], ['Care Planning', 3],
    ['Clinical Documentation', 3], ['Patient Safety', 3], ['Infection Control', 3],
    ['Triage', 3], ['Medication Administration', 3], ['Compassionate Care', 3],
    ['Interdisciplinary Collaboration', 2], ['Evidence-Based Practice', 2],
    ['Clinical Trials', 2], ['Discharge Planning', 2], ['Wound Care', 2],
    ['Safeguarding', 2], ['First Aid', 2], ['DBS Check', 2],
    ['Rehabilitation', 2], ['Occupational Therapy', 3], ['Physiotherapy', 3],
    ['Diagnosis', 3], ['Clinical Governance', 2], ['Healthcare Operations', 2],
    ['Staff Management', 2], ['Public Health', 2], ['Health Promotion', 1],
    ['Epidemiology', 2], ['Policy Development', 2],
  ],

  /* ------------------------------------------------- teaching & research -- */
  Education: [
    ['Lesson Planning', 4], ['Classroom Management', 3], ['Curriculum Development', 3],
    ['Differentiation', 3], ['Pedagogy', 3], ['Behaviour Management', 3],
    ['Student Engagement', 3], ['Parent Engagement', 2], ['Assessment', 2],
    ['Grading', 2], ['Educational Technology', 2], ['Literacy', 1],
    ['Safeguarding', 2], ['Formative Assessment', 3], ['Grading & Feedback', 2],
  ],
  Research: [
    ['Research Design', 4], ['Methodology', 3], ['Scientific Writing', 3],
    ['Grant Writing', 3], ['Peer Review', 3], ['Laboratory Techniques', 3],
    ['Statistical Analysis', 3], ['Publication', 2], ['Ethics Approval', 2],
    ['Literature Review', 2], ['Data Collection', 2], ['Collaboration', 1],
  ],

  /* -------------------------------------------------- legal & compliance -- */
  Legal: [
    ['Legal Research', 3], ['Contract Drafting', 3], ['Regulatory Compliance', 3],
    ['Data Protection', 3], ['Policy Development', 2], ['Litigation Support', 2],
    ['Corporate Governance', 3], ['Risk Assessment', 2], ['Stakeholder Advice', 2],
    ['GDPR', 2], ['Compliance', 2], ['Due Diligence', 2],
  ],

  /* --------------------------------------------------------- people ops -- */
  People: [
    ['Recruiting', 3], ['Talent Acquisition', 3], ['Employee Relations', 3],
    ['Onboarding', 2], ['Performance Management', 3], ['Compensation & Benefits', 2],
    ['Workforce Planning', 3], ['Employment Law', 3], ['HRIS', 2],
    ['Learning & Development', 2], ['Absence Management', 2], ['Succession Planning', 2],
  ],

  /* ------------------------------------------ operations & engineering -- */
  Operations: [
    ['Project Management', 3], ['Process Improvement', 3], ['Supply Chain Management', 3],
    ['Procurement', 3], ['Vendor Management', 2], ['Lean Six Sigma', 3],
    ['Capacity Planning', 2], ['Change Management', 2], ['Stakeholder Management', 2],
    ['Continuous Improvement', 3], ['Root Cause Analysis', 3], ['Budgeting', 2],
  ],
  Engineering: [
    ['CAD', 3], ['AutoCAD', 3], ['SolidWorks', 3], ['Quality Assurance', 3],
    ['Maintenance', 2], ['Lean Manufacturing', 3], ['ISO 9001', 2],
    ['Health & Safety', 2], ['Process Design', 2], ['Cost Estimation', 2],
    ['Troubleshooting', 2], ['Welding', 2], ['Regulatory Compliance', 2],
    ['Building Regulations', 2], ['ISO Standards', 2],
  ],

  /* ------------------------------------ service, hospitality & customer -- */
  Customer: [
    ['Customer Service', 3], ['Conflict Resolution', 3], ['Ticketing Systems', 2],
    ['Escalation Management', 2], ['SLA Management', 3], ['Customer Satisfaction', 3],
    ['Active Listening', 2], ['First Contact Resolution', 3], ['Quality Assurance', 2],
    ['Customer Success', 3], ['Process Documentation', 2],
  ],
  Hospitality: [
    ['Food Safety', 3], ['HACCP', 3], ['Menu Planning', 3], ['Front of House', 3],
    ['Housekeeping Operations', 2], ['Event Coordination', 3], ['Banqueting', 2],
    ['Wine Service', 2], ['Guest Experience', 3], ['Catering', 3],
    ['Supplier Negotiation', 2],
  ],

  /* -------------------------------------------------- transferable skills -- */
  /* ------------------------------------- tools & delivery methods ------ */
  Tools: [
    ['Git', 3], ['GitHub', 2], ['GitLab', 1], ['Jira', 1], ['Agile', 2],
    ['Scrum', 2], ['Postman', 1], ['Kanban', 1], ['Confluence', 1],
  ],

  /* ------------------------------------------- transferable skills ------ */
  Soft: [
    ['Leadership', 3], ['Mentoring', 2], ['Communication', 2],
    ['Problem Solving', 2], ['Project Management', 2], ['Cross-functional', 1],
    ['Teamwork', 1], ['Public Speaking', 1], ['Technical Writing', 2],
    ['Coaching', 2], ['Presenting', 2], ['Time Management', 1],
    ['Adaptability', 1], ['Decision Making', 2], ['Attention to Detail', 2],
    ['Administration', 1], ['Report Writing', 2], ['Customer Focus', 2],
    ['Team Leadership', 3], ['Candidate Experience', 2], ['Consulting', 2],
    ['Scheduling', 2], ['Renewal Management', 2], ['Case Management', 2],
    ['Documentation', 2], ['Stakeholder Engagement', 3], ['Reporting', 2],
    ['Ethics & Compliance', 2], ['Sales', 2],
  ],
};

/** Flattened lookup: lowercase alias -> { name, category, weight }. */
const SKILL_INDEX = new Map();
for (const [category, entries] of Object.entries(SKILL_TAXONOMY)) {
  for (const [name, weight] of entries) {
    SKILL_INDEX.set(name.toLowerCase(), { name, category, weight });
  }
}

/**
 * Aliases map surface forms found in real CVs onto canonical skill names.
 * Keyed by the alias in lowercase.
 */
const ALIASES = {
  js: 'JavaScript',
  ts: 'TypeScript',
  'node js': 'Node.js',
  nodejs: 'Node.js',
  node: 'Node.js',
  reactjs: 'React',
  'react.js': 'React',
  nextjs: 'Next.js',
  'next js': 'Next.js',
  vuejs: 'Vue',
  mongodb: 'MongoDB',
  mongo: 'MongoDB',
  postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL',
  'amazon web services': 'AWS',
  gcp: 'Google Cloud',
  'google cloud platform': 'Google Cloud',
  'continuous integration': 'CI/CD',
  'continuous delivery': 'CI/CD',
  cicd: 'CI/CD',
  'ci cd': 'CI/CD',
  'machine learning': 'Machine Learning',
  ml: 'Machine Learning',
  dl: 'Deep Learning',
  'deep learning': 'Deep Learning',
  nlp: 'NLP',
  'natural language processing': 'NLP',
  'large language models': 'LLM',
  llms: 'LLM',
  'generative ai': 'LLM',
  genai: 'LLM',
  'artificial intelligence': 'Machine Learning',
  ai: 'Machine Learning',
  'rest api': 'REST API',
  'restful api': 'REST API',
  'rest apis': 'REST APIs',
  'restful apis': 'REST APIs',
  'restful web services': 'REST APIs',
  'version control': 'Git',
  'source control': 'Git',
  'pair programming': 'Code Review',
  'unit tests': 'Unit Testing',
  'unit testing': 'Unit Testing',
  'e2e testing': 'End-to-end Testing',
  'end to end testing': 'End-to-end Testing',
  'responsive design': 'Responsive Design',
  'design systems': 'Design Systems',
  'tailwind': 'Tailwind CSS',
  'tailwindcss': 'Tailwind CSS',
  k8s: 'Kubernetes',
  'docker compose': 'Docker',
  containers: 'Docker',
  containerization: 'Docker',
  figma: 'Figma',
  'power bi': 'Power BI',
  powerbi: 'Power BI',
  'data viz': 'Data Visualization',
  'data visualization': 'Data Visualization',
  'data analysis': 'Data Analysis',
  'data analytics': 'Data Analysis',
  'apache kafka': 'Kafka',
  kafka: 'Kafka',
  graphqlql: 'GraphQL',
  sklearn: 'scikit-learn',
  'scikit learn': 'scikit-learn',
  'pytorch': 'PyTorch',
  tf: 'TensorFlow',
  tensorflow: 'TensorFlow',
  'spring boot': 'Spring Boot',
  dotnet: '.NET',
  'asp.net': '.NET',
  aspnet: '.NET',
  'flutter': 'Flutter',
  'react native': 'React Native',

  /* --- cross-field aliases: surface forms real CVs use outside software --- */
  'search engine optimisation': 'SEO',
  'search engine optimization': 'SEO',
  'search engine marketing': 'SEM',
  'google ads': 'SEM',
  'paid search': 'SEM',
  ga4: 'Google Analytics',
  'web analytics': 'Web Analytics',
  'content marketing': 'Content Strategy',
  'content writing': 'Copywriting',
  'copy writing': 'Copywriting',
  'brand building': 'Brand Strategy',
  'social media': 'Social Media Marketing',
  'media planning': 'Campaign Management',
  'customer journey': 'Audience Segmentation',
  segmentation: 'Audience Segmentation',
  'press relations': 'Public Relations',
  'media buying': 'Paid Media',

  'pipeline management': 'Sales Pipeline Management',
  'business development': 'Lead Generation',
  'key accounts': 'Key Account Management',
  'account director': 'Key Account Management',
  'sales targets': 'Forecasting',
  quota: 'Forecasting',
  'objection handling': 'Objection Handling',
  'cold calling': 'Cold Outreach',

  'financial reporting': 'Financial Reporting',
  'financial modelling': 'Financial Modelling',
  'financial modeling': 'Financial Modelling',
  'budget management': 'Budgeting',
  cashflow: 'Cash Flow Management',
  'cost control': 'Cost Control',
  'tax compliance': 'Taxation',
  'month end': 'Year End',
  'year-end': 'Year End',
  ageing: 'Accounts Receivable',
  'credit control': 'Accounts Receivable',
  'purchase ledger': 'Accounts Payable',
  'sage 50': 'Sage',
  'quickbooks online': 'QuickBooks',

  nursing: 'Patient Care',
  'patient care': 'Patient Care',
  'care planning': 'Care Planning',
  'clinical practice': 'Clinical Assessment',
  'infection prevention': 'Infection Control',
  'care of the elderly': 'Patient Care',
  'moving and handling': 'Patient Care',
  'first aid at work': 'First Aid',
  dbs: 'DBS Check',

  'lesson planning': 'Lesson Planning',
  'class management': 'Classroom Management',
  'curriculum design': 'Curriculum Development',
  behaviour: 'Behaviour Management',
  'behaviour management': 'Behaviour Management',
  'pastoral care': 'Safeguarding',
  'safeguarding children': 'Safeguarding',
  'key stage': 'Curriculum Development',
  marking: 'Grading',
  'formative assessment': 'Formative Assessment',

  'process improvement': 'Process Improvement',
  'supply chain': 'Supply Chain Management',
  'continuous improvement': 'Continuous Improvement',
  'root cause': 'Root Cause Analysis',
  'six sigma': 'Lean Six Sigma',
  'lean manufacturing': 'Lean Manufacturing',
  'quality assurance': 'Quality Assurance',
  'health and safety': 'Health & Safety',
  iso9001: 'ISO 9001',

  'customer support': 'Customer Service',
  'customer experience': 'Customer Experience',
  helpdesk: 'Ticketing Systems',
  'help desk': 'Ticketing Systems',
  'service desk': 'Ticketing Systems',
  'first contact resolution': 'First Contact Resolution',
  'customer satisfaction': 'Customer Satisfaction',
  'complaint handling': 'Conflict Resolution',

  'talent acquisition': 'Talent Acquisition',
  'employee relations': 'Employee Relations',
  'performance reviews': 'Performance Management',
  'performance management': 'Performance Management',
  'learning and development': 'Learning & Development',
  'l&d': 'Learning & Development',

  'data protection': 'Data Protection',
  'policy writing': 'Policy Development',
  'contract management': 'Contract Drafting',

  'food hygiene': 'Food Safety',
  'menu development': 'Menu Planning',
  'front of house': 'Front of House',
  'guest service': 'Guest Experience',

  merchandising: 'Merchandising',
  'stock rotation': 'Stock Control',
  'inventory control': 'Inventory Management',

  'report writing': 'Report Writing',
  'data entry': 'Administration',
  admin: 'Administration',
  'office administration': 'Administration',
  'problem solving': 'Problem Solving',
  'problem-solving': 'Problem Solving',
  'decision making': 'Decision Making',
  'time management': 'Time Management',
  'attention to detail': 'Attention to Detail',
  'customer service skills': 'Customer Focus',
};

/**
 * Hard/soft signals used for role inference, mapped to canonical skill names.
 * The first role family with the strongest signal wins, but roles are scored
 * and ranked rather than picked exclusively.
 */
const ROLE_PROFILES = {
  'Frontend Engineer': ['React', 'Vue', 'Angular', 'CSS', 'Tailwind CSS', 'JavaScript', 'TypeScript', 'Next.js', 'Redux', 'Svelte'],
  'Backend Engineer': ['Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'PostgreSQL', 'MongoDB', 'REST API', 'gRPC', 'Redis', 'Kafka', 'Go', 'Java', 'GraphQL', 'Microservices'],
  'Full Stack Developer': ['React', 'Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'JavaScript', 'TypeScript', 'Next.js', 'REST API', 'GraphQL'],
  'DevOps Engineer': ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Jenkins', 'Linux', 'Nginx', 'Ansible', 'GitHub Actions'],
  'Machine Learning Engineer': ['Machine Learning', 'Deep Learning', 'Python', 'PyTorch', 'TensorFlow', 'NLP', 'Pandas', 'LLM', 'NumPy'],
  'Data Analyst': ['Data Analysis', 'SQL', 'Power BI', 'Tableau', 'Excel', 'Pandas', 'Statistics', 'Data Visualization'],
  'Data Engineer': ['ETL', 'Apache Spark', 'Airflow', 'SQL', 'Python', 'dbt', 'Snowflake', 'Data Analysis', 'Kafka', 'Pandas'],
  'Mobile Developer': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Android', 'iOS', 'Expo'],
  'QA / Test Engineer': ['Jest', 'Cypress', 'Playwright', 'Selenium', 'Unit Testing', 'TDD', 'End-to-end Testing', 'Vitest'],
  'Security Engineer': ['Security', 'Penetration Testing', 'OWASP', 'Authentication', 'OAuth', 'Encryption', 'SOC 2'],
  'UI/UX Designer': ['Figma', 'Photoshop', 'Blender', 'Design Systems', 'Responsive Design', 'Accessibility'],

  /* ------------------------------------------- non-software role ladders -- */
  /* Keyed by field so `suggestRoles` can offer a nurse nurse roles, not
   * DevOps roles. `suggestedRolesFor` in localAnalyzer reads this. */
  'UX Researcher': ['User Research', 'Usability Testing', 'Prototyping', 'Figma', 'Storytelling', 'Communication', 'Web Analytics'],
  'Brand Manager': ['Brand Strategy', 'Campaign Management', 'Market Research', 'Content Strategy', 'Public Relations', 'Copywriting'],
  'Digital Marketing Specialist': ['SEO', 'SEM', 'Google Analytics', 'Paid Media', 'Content Strategy', 'Email Marketing', 'A/B Testing'],
  'Content Strategist': ['Content Strategy', 'Copywriting', 'SEO', 'Editing', 'Audience Understanding', 'Storytelling', 'Social Media Marketing'],
  'Account Executive': ['Negotiation', 'Lead Generation', 'Sales Pipeline Management', 'Closing', 'Account Management', 'Forecasting', 'Objection Handling'],
  'Sales Manager': ['Sales Pipeline Management', 'Leadership', 'Forecasting', 'Negotiation', 'Coaching', 'Performance Management', 'Budgeting'],
  'Financial Analyst': ['Financial Modelling', 'Financial Reporting', 'Excel', 'Data Analysis', 'Forecasting', 'Budgeting', 'Variance Analysis'],
  'Financial Controller': ['Financial Reporting', 'Management Accounting', 'IFRS', 'Audit', 'Budgeting', 'Taxation', 'Leadership'],
  'Chartered Accountant': ['Financial Reporting', 'Taxation', 'Audit', 'IFRS', 'Reconciliation', 'Bookkeeping', 'Regulatory Compliance'],
  'Registered Nurse': ['Patient Care', 'Clinical Assessment', 'Care Planning', 'Patient Safety', 'Infection Control', 'Triage', 'Medication Administration'],
  'Clinical Nurse Specialist': ['Patient Care', 'Clinical Assessment', 'Evidence-Based Practice', 'Mentoring', 'Care Planning', 'Interdisciplinary Collaboration'],
  'Pharmacist': ['Patient Care', 'Medication Administration', 'Clinical Assessment', 'Patient Safety', 'Care Planning', 'Compassionate Care'],
  'Consultant Physician': ['Clinical Assessment', 'Diagnosis', 'Care Planning', 'Evidence-Based Practice', 'Patient Safety', 'Clinical Documentation', 'Mentoring'],
  'Resident Physician': ['Clinical Assessment', 'Diagnosis', 'Care Planning', 'Patient Safety', 'Clinical Documentation', 'Triage', 'Compassionate Care'],
  'Allied Health Professional': ['Patient Care', 'Clinical Assessment', 'Care Planning', 'Rehabilitation', 'Patient Safety', 'Clinical Documentation', 'Compassionate Care'],
  'Healthcare Manager': ['Healthcare Operations', 'Care Planning', 'Quality Assurance', 'Staff Management', 'Clinical Governance', 'Budgeting', 'Regulatory Compliance'],
  'Public Health Specialist': ['Public Health', 'Health Promotion', 'Epidemiology', 'Policy Development', 'Data Analysis', 'Stakeholder Engagement', 'Risk Assessment'],
  'Secondary School Teacher': ['Lesson Planning', 'Classroom Management', 'Curriculum Development', 'Assessment', 'Differentiation', 'Student Engagement', 'Safeguarding'],
  'Primary School Teacher': ['Lesson Planning', 'Classroom Management', 'Differentiation', 'Behaviour Management', 'Parent Engagement', 'Safeguarding', 'Assessment'],
  'University Lecturer': ['Lesson Planning', 'Curriculum Development', 'Assessment', 'Research Design', 'Publication', 'Student Engagement', 'Grading'],
  'Employment Consultant': ['Recruiting', 'Talent Acquisition', 'Candidate Experience', 'Interviewing', 'Cold Outreach', 'Communication', 'Closing'],
  'HR Business Partner': ['Employee Relations', 'Performance Management', 'Employment Law', 'Workforce Planning', 'Policy Development', 'Consulting', 'Data Protection'],
  'Supply Chain Manager': ['Supply Chain Management', 'Procurement', 'Forecasting', 'Vendor Management', 'Inventory Management', 'Capacity Planning', 'Process Improvement'],
  'Project Manager': ['Project Management', 'Process Improvement', 'Stakeholder Management', 'Budgeting', 'Risk Management', 'Agile', 'Scrum'],
  'Operations Manager': ['Process Improvement', 'Continuous Improvement', 'Root Cause Analysis', 'Cost Control', 'Lean Six Sigma', 'Team Leadership', 'Budgeting'],
  'Mechanical Engineer': ['CAD', 'SolidWorks', 'Maintenance', 'Quality Assurance', 'Health & Safety', 'Root Cause Analysis', 'Troubleshooting'],
  'Civil Engineer': ['AutoCAD', 'Health & Safety', 'Cost Estimation', 'Regulatory Compliance', 'Project Management', 'Building Regulations', 'Quality Assurance'],
  'Quality Engineer': ['Quality Assurance', 'Root Cause Analysis', 'Continuous Improvement', 'ISO 9001', 'Process Improvement', 'Statistical Analysis', 'Health & Safety'],
  'Customer Success Manager': ['Customer Success', 'Account Management', 'Customer Satisfaction', 'Renewal Management', 'Escalation Management', 'Onboarding', 'Communication'],
  'Customer Service Manager': ['Customer Service', 'SLA Management', 'Ticketing Systems', 'Team Leadership', 'Quality Assurance', 'Conflict Resolution', 'Coaching'],
  'Head Chef': ['Food Safety', 'Menu Planning', 'HACCP', 'Cost Control', 'Team Leadership', 'Food Safety', 'Inventory Management'],
  'Restaurant Manager': ['Front of House', 'Food Safety', 'HACCP', 'Inventory Management', 'Cost Control', 'Customer Service', 'Scheduling'],
  'Retail Manager': ['Retail Operations', 'Merchandising', 'Visual Merchandising', 'Store Operations', 'Stock Control', 'Team Leadership', 'Sales'],
  'Multi-Channel Retailer': ['Retail Operations', 'Stock Control', 'Customer Service', 'Merchandising', 'Upselling', 'Inventory Management', 'POS Systems'],
  'Research Scientist': ['Research Design', 'Methodology', 'Scientific Writing', 'Grant Writing', 'Publication', 'Statistical Analysis', 'Peer Review'],
  'Communications Officer': ['Public Relations', 'Writing', 'Media Relations', 'Press Release', 'Stakeholder Engagement', 'Editing', 'Copywriting'],
  'Compliance Officer': ['Regulatory Compliance', 'Policy Development', 'Data Protection', 'Risk Assessment', 'Reporting', 'Stakeholder Advice', 'Ethics & Compliance'],
  'Paralegal': ['Legal Research', 'Contract Drafting', 'Documentation', 'Compliance', 'Case Management', 'Communication', 'Attention to Detail'],
  'UI/UX Designer General': ['Figma', 'User Research', 'Prototyping', 'Typography', 'Design Systems', 'Accessibility', 'Wireframing'],
  'Software Engineer': ['JavaScript', 'Git', 'Unit Testing', 'Agile', 'REST API', 'Python', 'Java', 'Problem Solving'],
  'Recruiter': ['Recruiting', 'Talent Acquisition', 'Interviewing', 'Candidate Experience', 'Cold Outreach', 'Closing', 'Communication'],
  'Finance & Accounts Analyst': ['Financial Reporting', 'Bookkeeping', 'Reconciliation', 'Excel', 'Data Analysis', 'Budgeting', 'Variance Analysis'],
  'Copywriter': ['Copywriting', 'Content Strategy', 'SEO', 'Editing', 'Storytelling', 'Audience Understanding', 'Fact Checking'],
};

/**
 * Role ladders per field. `suggestRoles` only ever offers roles from the
 * candidate's detected field, which is what stops a CV being told it could be
 * a DevOps Engineer. The `general` field falls back to a cross-industry set.
 */
const FIELD_ROLE_PROFILES = {
  software: [
    'Software Engineer', 'Frontend Engineer', 'Backend Engineer', 'Full Stack Developer',
    'DevOps Engineer', 'Data Analyst', 'Machine Learning Engineer', 'UI/UX Designer',
    'Project Manager', 'Mobile Developer', 'QA / Test Engineer', 'Security Engineer',
  ],
  data: [
    'Data Analyst', 'Machine Learning Engineer', 'Data Engineer', 'Research Scientist',
    'Financial Analyst', 'Project Manager', 'UX Researcher', 'Compliance Officer',
  ],
  design: [
    'UI/UX Designer', 'UX Researcher', 'Brand Manager', 'Digital Marketing Specialist',
    'Content Strategist', 'Communications Officer', 'Project Manager',
  ],
  marketing: [
    'Digital Marketing Specialist', 'Content Strategist', 'Brand Manager',
    'Communications Officer', 'Sales Manager', 'UX Researcher', 'Customer Success Manager',
  ],
  sales: [
    'Account Executive', 'Sales Manager', 'Customer Success Manager', 'Retail Manager',
    'Multi-Channel Retailer', 'Employment Consultant', 'Account Executive',
  ],
  finance: ['Financial Analyst', 'Chartered Accountant', 'Financial Controller', 'Compliance Officer', 'Project Manager', 'Research Scientist'],
  accounting: ['Chartered Accountant', 'Financial Controller', 'Financial Analyst', 'Compliance Officer'],
  healthcare: [
    'Registered Nurse', 'Clinical Nurse Specialist', 'Pharmacist',
    'Consultant Physician', 'Resident Physician', 'Allied Health Professional',
    'Healthcare Manager', 'Public Health Specialist',
  ],
  education: [
    'Secondary School Teacher', 'Primary School Teacher', 'University Lecturer',
    'Employment Consultant', 'Research Scientist',
  ],
  legal: ['Paralegal', 'Compliance Officer', 'HR Business Partner', 'Project Manager', 'Chartered Accountant'],
  human_resources: [
    'Employment Consultant', 'HR Business Partner', 'Recruiter',
    'Project Manager', 'Compliance Officer',
  ],
  operations: [
    'Project Manager', 'Operations Manager', 'Supply Chain Manager',
    'Quality Engineer', 'Mechanical Engineer', 'Finance & Accounts Analyst',
  ],
  engineering_manufacturing: [
    'Mechanical Engineer', 'Civil Engineer', 'Quality Engineer',
    'Operations Manager', 'Project Manager', 'Supply Chain Manager',
  ],
  customer_service: [
    'Customer Success Manager', 'Customer Service Manager', 'Employment Consultant',
    'Retail Manager', 'Multi-Channel Retailer', 'Project Manager',
  ],
  hospitality: ['Head Chef', 'Restaurant Manager', 'Retail Manager', 'Operations Manager', 'Customer Service Manager'],
  retail: ['Retail Manager', 'Multi-Channel Retailer', 'Customer Service Manager', 'Account Executive', 'Operations Manager'],
  media: ['Communications Officer', 'Content Strategist', 'Brand Manager', 'Digital Marketing Specialist', 'Copywriter'],
  research: ['Research Scientist', 'University Lecturer', 'Data Analyst', 'Compliance Officer', 'Project Manager'],
  general: [
    'Project Manager', 'Operations Manager', 'Customer Service Manager',
    'Employment Consultant', 'Customer Success Manager', 'HR Business Partner',
    'Chartered Accountant', 'Communications Officer', 'Financial Analyst',
  ],
};

/** Transferable keywords that recruiters screen on in almost every industry. */
const UNIVERSAL_KEYWORDS = [
  'Leadership', 'Communication', 'Problem Solving', 'Teamwork', 'Project Management',
  'Collaboration', 'Mentoring', 'Time Management', 'Adaptability',
  'Stakeholder Management', 'Decision Making', 'Attention to Detail', 'Report Writing',
  'Cross-functional', 'Presentation', 'Coaching',
];

/**
 * Field-specific ATS keywords. These are the phrases a recruiter for THAT
 * industry filters on, so they are only suggested to candidates in that field.
 */
const FIELD_ATS_KEYWORDS = {
  software: ['Scalability', 'Testing', 'Documentation', 'Performance', 'Security', 'Code Review', 'Agile', 'CI/CD', 'System Design', 'Code Quality'],
  data: ['Statistical Analysis', 'Data Quality', 'Insight Generation', 'Reporting', 'Modelling', 'Visualization', 'Experiment Design', 'KPI Ownership', 'Stakeholder Reporting', 'Data Ethics'],
  design: ['User Research', 'Wireframing', 'Prototyping', 'Design Systems', 'Accessibility', 'Visual Design', 'Usability Testing', 'Design Critique', 'Information Architecture', 'Interaction Design'],
  marketing: ['Campaign Management', 'Brand Strategy', 'Content Strategy', 'SEO', 'Conversion Rate', 'Market Research', 'Stakeholder Communication', 'Budget Ownership', 'Audience Segmentation', 'Campaign Reporting'],
  sales: ['Pipeline Management', 'Negotiation', 'Forecasting', 'Quota Attainment', 'Account Planning', 'Customer Retention', 'Lead Generation', 'Commercial Awareness', 'Closing', 'Objection Handling'],
  finance: ['Financial Reporting', 'Budgeting', 'Forecasting', 'Variance Analysis', 'Risk Management', 'Financial Modelling', 'Cash Flow', 'Audit', 'Compliance', 'Stakeholder Reporting'],
  accounting: ['Financial Reporting', 'Reconciliation', 'Taxation', 'Payroll', 'Audit', 'Bookkeeping', 'Month End', 'Statutory Reporting', 'Controls', 'Compliance'],
  healthcare: ['Patient Care', 'Patient Safety', 'Clinical Governance', 'Care Planning', 'Multidisciplinary Working', 'Infection Control', 'Record Keeping', 'Safeguarding', 'Evidence-Based Practice', 'Duty of Candour'],
  education: ['Lesson Planning', 'Curriculum Development', 'Differentiation', 'Classroom Management', 'Assessment', 'Behaviour Management', 'Safeguarding', 'Parent Engagement', 'Progress Monitoring', 'Inclusion'],
  legal: ['Legal Research', 'Contract Drafting', 'Compliance', 'Data Protection', 'Risk Assessment', 'Due Diligence', 'Policy Development', 'Governance', 'Stakeholder Advice', 'Ethical Practice'],
  human_resources: ['Employee Relations', 'Talent Acquisition', 'Performance Management', 'Employment Law', 'Workforce Planning', 'Onboarding', 'Compensation', 'Employee Engagement', 'HR Reporting', 'Policy Development'],
  operations: ['Project Management', 'Process Improvement', 'Continuous Improvement', 'Budget Ownership', 'Stakeholder Management', 'Risk Management', 'Vendor Management', 'Reporting', 'Change Management', 'Root Cause Analysis'],
  engineering_manufacturing: ['Health & Safety', 'Quality Assurance', 'Compliance', 'Project Management', 'Cost Management', 'Root Cause Analysis', 'Maintenance', 'Documentation', 'Continuous Improvement', 'Risk Assessment'],
  customer_service: ['Customer Satisfaction', 'SLA Management', 'Escalation Management', 'Issue Resolution', 'Communication', 'Quality Assurance', 'Customer Retention', 'Ticketing Systems', 'Process Documentation', 'First Contact Resolution'],
  hospitality: ['Food Safety', 'HACCP', 'Customer Service', 'Team Leadership', 'Cost Control', 'Inventory Management', 'Menu Planning', 'Health & Safety', 'Guest Experience', 'Scheduling'],
  retail: ['Retail Operations', 'Customer Service', 'Sales Target', 'Merchandising', 'Stock Control', 'Visual Merchandising', 'Team Leadership', 'Upselling', 'Store Operations', 'Inventory Management'],
  media: ['Writing', 'Editing', 'Interviewing', 'Audience Understanding', 'Storytelling', 'Commissioning', 'Fact Checking', 'Deadline Management', 'Research', 'Publication'],
  research: ['Research Design', 'Methodology', 'Grant Writing', 'Publication', 'Peer Review', 'Data Collection', 'Statistical Analysis', 'Ethics Approval', 'Collaboration', 'Grant Management'],
  general: ['Communication', 'Leadership', 'Problem Solving', 'Project Management', 'Time Management', 'Collaboration', 'Report Writing', 'Attention to Detail', 'Adaptability', 'Decision Making'],
};

/** Keywords that are high-signal for ATS screening but may be missing. */
const ATS_KEYWORDS = [
  'Leadership', 'Communication', 'Problem Solving', 'Teamwork', 'Project Management',
  'Cross-functional', 'Technical Writing', 'Mentoring', 'Documentation', 'Performance',
  'Collaboration', 'Presentation', 'Coaching', 'Report Writing', 'Attention to Detail',
];

/**
 * Resolve the ATS keyword pool for a detected field: universal transferable
 * terms plus that field's own screen terms, de-duplicated.
 */
const atsKeywordsFor = (field) => [
  ...new Set([...UNIVERSAL_KEYWORDS, ...(FIELD_ATS_KEYWORDS[field] || FIELD_ATS_KEYWORDS.general)]),
];

/**
 * CV section headings across professions. Regulated and creative fields use
 * different vocabulary, and a nurse's "Registration" or a chef's "Menu" is
 * evidence, so those get their own patterns.
 *
 * Every alternative is anchored to a line start. An unanchored alternative
 * turns a heading pattern into a false section boundary the moment a body line
 * happens to contain the word — "NMC Registration: 76A1234X" was read as the
 * start of a certifications section, which truncated the registration above it.
 */
const SECTION_PATTERNS = {
  experience: /(^|\n)\s*((work|professional|employment|relevant)\s+)?(experience|employment history|career history|professional background|work history|clinical experience|practical experience)/i,
  education: /(^|\n)\s*(education|academic background|qualifications?|degrees?|training and qualifications)/i,
  skills: /(^|\n)\s*((technical|core|key|professional)\s+)?(skills|competencies|technologies|tech stack|areas of expertise|clinical skills|strengths)/i,
  projects: /(^|\n)\s*(projects?|portfolio|personal projects|selected work|key projects|creative work|case studies)/i,
  // Registrations and memberships are kept apart from certifications because
  // in a regulated field a licence number is the gating evidence, and a
  // candidate who put it under "Training" should still have it surfaced.
  registrations: /(^|\n)\s*((professional|medical|legal|statutory|regulatory|nursing|clinical|practice)\s+)?(registration|registrations|licence|licenses|licensure|permits?|authorisations?|authorizations?)/i,
  affiliations: /(^|\n)\s*(professional\s+)?(membership|memberships|affiliations?|bodies|societies|associations?|institutes?|unions?|member of)/i,
  certifications: /(^|\n)\s*(certifications?|licenses?|licences?|courses?|training|registrations?|memberships?|awards?|accreditation)/i,
  languages: /(^|\n)\s*(languages?|spoken languages?|language proficiency)/i,
  summary: /(^|\n)\s*((professional)\s+)?(summary|professional profile|objective|profile|about me|personal statement|career objective|overview)/i,
  achievements: /(^|\n)\s*(achievements?|accomplishments?|awards|honors?|highlights|key achievements)/i,
  publications: /(^|\n)\s*(publications?|research|papers?|presented at|conference presentations)/i,
};

/**
 * Action verbs that signal ownership of an outcome, across all professions.
 * The old list was engineering-only ("architected", "migrated"); these cover
 * clinical, teaching, commercial and creative work too.
 */
const STRONG_VERB = /\b(led|built|developed|designed|architected|launched|increased|reduced|improved|optimi[sz]ed|automated|delivered|implemented|managed|spearheaded|drove|established|scaled|created|negotiated|mentored|orchestrated|migrated|cut|grew|coached|coordinated|facilitated|directed|supervised|administered|assessed|diagnosed|taught|trained|advised|analyse[d]?|analyze[d]?|executed|maintained|transformed|restructured|resolved|exceeded|surpassed|generated|executed|streamlined|standardised|standardized|prioritised|prioritized|represented|commissioned|produced|presented|contributed|achieved|accomplished|exceeded|won|expanded|launched)\b/gi;

/**
 * Detects a measurable result in a bullet point. Deliberately does NOT put a
 * word boundary after the unit: "%" and "$" are non-word characters, so
 * "\b" after them can never match, which silently killed every percentage.
 *
 * Matches: 42%, 35 %, $1.2M, £400k, GBP 14M, 3+, ~20 users, 10 million,
 * 400,000 patients, 2x growth, over 30 clients
 */
const QUANTIFIED = new RegExp(
  [
    // money, by symbol or ISO code
    '(?:[$€£]|usd|eur|gbp|aud|cad|inr)\\s?\\d[\\d,.]*\\s*(?:[kmb]\\b|million|billion|thousand)?',
    // a bare scaled number: 14M, 400k, 10 million
    '\\b\\d[\\d,.]*\\s?(?:[kmb]\\b|million|billion|thousand)',
    // grouped thousands, the dominant form outside tech: 400,000, 1,200
    '\\b\\d{1,3}(?:,\\d{3})+\\b',
    // percentages
    '\\d[\\d,.]*\\s*(?:%|percent\\b)',
    // counts with a magnitude marker
    '\\b\\d{1,3}\\s*\\+',
    // a multiple: 2x, 3.5x
    '\\b\\d+(?:\\.\\d+)?\\s?x\\b',
    // team size and tenure: 5-person team, 4 years of experience
    '\\b\\d+\\s?-person\\b',
    // tenure is a metric in its own right: "10 years managing statutory reporting"
    '\\b\\d{1,3}\\s?(?:years?|decades?)\\b',
    // hedged/approximate counts
    '(?:~|over|nearly|almost|approx\\w*|around|about|up to|more than|at least)\\s+\\d',
    // a plain count against a countable unit, tolerating one or two
    // modifiers: "300 outpatient clinics", "4 clinical fellows"
    '\\b\\d+\\s+(?:[a-z-]+\\s+){0,2}(?:patients|clients|customers|users|members|students|pupils|employees|staff|teammates|colleagues|schools|teachers|clinics|hospitals|branches|stores|sites|cases|referrals|appointments|accounts|invoices|orders|bookings|events|tenants|properties|lessons|sessions|workshops|reports|audits|inspections|studies|trials|units|headcount|beds|seats|keywords|products|articles|videos|episodes|listings|fellows)\\b',
  ].join('|'),
  'i'
);

module.exports = {
  SKILL_TAXONOMY,
  SKILL_INDEX,
  ALIASES,
  ROLE_PROFILES,
  FIELD_ROLE_PROFILES,
  ATS_KEYWORDS,
  UNIVERSAL_KEYWORDS,
  FIELD_ATS_KEYWORDS,
  atsKeywordsFor,
  SECTION_PATTERNS,
  STRONG_VERB,
  QUANTIFIED,
};
