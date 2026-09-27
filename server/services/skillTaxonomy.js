/**
 * Curated skill taxonomy used by the deterministic local analyser.
 * Weight reflects how strongly the skill influences shortlisting decisions.
 */
const SKILL_TAXONOMY = {
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
  Tools: [
    ['Git', 3], ['GitHub', 2], ['GitLab', 1], ['Jira', 1], ['Agile', 2],
    ['Scrum', 2], ['Webpack', 2], ['Vite', 1], ['Postman', 1], ['Figma', 2],
    ['Photoshop', 1], ['Blender', 1],
  ],
  Soft: [
    ['Leadership', 3], ['Mentoring', 2], ['Code Review', 2], ['Communication', 2],
    ['Problem Solving', 2], ['Project Management', 2], ['Cross-functional', 1],
    ['Teamwork', 1], ['Public Speaking', 1], ['Technical Writing', 2],
  ],
  Security: [
    ['OAuth', 2], ['JWT', 2], ['Authentication', 2], ['Authorization', 2],
    ['Penetration Testing', 2], ['OWASP', 2], ['Encryption', 2], ['Security', 2],
    ['SOC 2', 1], ['GDPR', 1],
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
  'Project Manager': ['Project Management', 'Agile', 'Scrum', 'Jira', 'Communication', 'Leadership'],
  'Software Engineer': ['JavaScript', 'Git', 'Data Structures', 'Algorithms', 'Testing', 'Agile', 'REST API', 'Python', 'Java'],
  'AI Engineer': ['LLM', 'Machine Learning', 'Python', 'LangChain', 'NLP', 'FastAPI', 'Deep Learning', 'PyTorch'],
};

/** Keywords that are high-signal for ATS screening but may be missing. */
const ATS_KEYWORDS = [
  'Leadership', 'Communication', 'Problem Solving', 'Teamwork', 'Project Management',
  'Cross-functional', 'Technical Writing', 'Mentoring', 'Code Review', 'Agile',
  'Testing', 'Documentation', 'Scalability', 'Performance', 'Security', 'Accessibility',
];

const SECTION_PATTERNS = {
  experience: /(^|\n)\s*(work\s+)?experience|employment|employment history|career history|professional background/i,
  education: /(^|\n)\s*education|academic|qualification|degrees?/i,
  skills: /(^|\n)\s*(technical\s+)?skills|core competencies|technologies|tech stack/i,
  projects: /(^|\n)\s*projects?|portfolio|personal projects/i,
  certifications: /(^|\n)\s*certifications?|licenses?|courses?|training/i,
  languages: /(^|\n)\s*languages?|spoken languages?/i,
  summary: /(^|\n)\s*(professional\s+)?summary|objective|profile|about me|overview/i,
  achievements: /(^|\n)\s*achievements?|accomplishments?|awards|honors?/i,
  publications: /(^|\n)\s*publications?|research|papers?/i,
};

const STRONG_VERB = /\b(led|built|developed|designed|architected|launched|increased|reduced|improved|optimi[sz]ed|automated|delivered|implemented|managed|spearheaded|drove|established|scaled|created|negotiated|mentored|orchestrated|migrated|cut|reduced|grew)\b/gi;

/**
 * Detects a measurable result in a bullet point. Deliberately does NOT put a
 * word boundary after the unit: "%" and "$" are non-word characters, so
 * "\b" after them can never match, which silently killed every percentage.
 *
 * Matches: 42%, 35 %, $1.2M, $400k, 3+, ~20 users, 10 million
 */
const QUANTIFIED = /(?:\$|€|£)\s?\d[\d,.]*\s*(?:[kmb]\b|million|billion|thousand)?|\d[\d,.]*\s*(?:%|percent\b)|\b\d{2,}\s*\+|~\s*\d/i;

module.exports = {
  SKILL_TAXONOMY,
  SKILL_INDEX,
  ALIASES,
  ROLE_PROFILES,
  ATS_KEYWORDS,
  SECTION_PATTERNS,
  STRONG_VERB,
  QUANTIFIED,
};
