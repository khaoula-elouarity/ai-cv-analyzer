/**
 * Seeds a demo account with realistic job descriptions so the matcher has
 * something to score against before a user saves their own jobs.
 *
 * Idempotent: re-running updates the existing demo user rather than
 * duplicating it. Safe to run against a populated database.
 *
 *   npm run seed
 *   npm run seed -- --email someone@example.com --password Secret123!
 */
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Job = require('../models/Job');
const { extractRequiredSkills } = require('../services/matcherService');

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const EMAIL = arg('--email', 'demo@cv-analyzer.dev');
const PASSWORD = arg('--password', 'Demo1234!');

const JOBS = [
  {
    title: 'Frontend Engineer',
    company: 'Northwind Labs',
    location: 'Remote (EU)',
    description:
      'We are hiring a Frontend Engineer to build accessible, high-performance web applications. ' +
      'You will own features end to end in React and TypeScript, work closely with designers, and ' +
      'help shape our component library. Requirements: strong JavaScript and HTML/CSS fundamentals, ' +
      'experience with React and its ecosystem, testing with Jest or Vitest, Git, and an eye for ' +
      'accessibility and performance. Experience with REST APIs and Vite or webpack is a plus.',
  },
  {
    title: 'Full-Stack Developer (MERN)',
    company: 'Corelight',
    location: 'Remote',
    description:
      'Join a small team building a customer-facing analytics product on the MERN stack. You will ' +
      'work across the board: MongoDB data modelling, Express REST APIs, React front ends, and ' +
      'deployment on cloud infrastructure. We are looking for solid JavaScript, Node.js, Express, ' +
      'React, MongoDB, JWT-based authentication, and Git experience. Familiarity with Docker, ' +
      'CI/CD, and automated testing is a strong plus. We value people who ship.',
  },
  {
    title: 'Backend Engineer, Node.js',
    company: 'Harbor Systems',
    location: 'Berlin, Germany (Hybrid)',
    description:
      'The Backend Engineer will design and operate our services that process millions of events ' +
      'per day. You will work primarily in Node.js and Express, with PostgreSQL and Redis, and you ' +
      'will own reliability: observability, rate limiting, and incident response. Requirements ' +
      'include production Node.js experience, SQL and NoSQL data modelling, and a security-first ' +
      'mindset around authentication and authorisation. Kafka and Kubernetes experience is a plus.',
  },
  {
    title: 'React Native Developer',
    company: 'Fitloop',
    location: 'Remote',
    description:
      'We need a React Native developer to build our iOS and Android app. You will ship features ' +
      'with React Native and Expo, integrate REST and GraphQL APIs, work with Redux, and handle ' +
      'release builds and store submissions. Strong JavaScript, React, and mobile UI experience ' +
      'are essential. We also value TypeScript and an interest in performance profiling on ' +
      'low-end devices.',
  },
];

const run = async () => {
  await connectDB();

  // upsert keeps the script idempotent across repeated runs.
  const user = await User.findOneAndUpdate(
    { email: EMAIL.toLowerCase() },
    {
      $setOnInsert: {
        name: 'Demo User',
        email: EMAIL.toLowerCase(),
        password: PASSWORD, // pre-save hook hashes it
        isDemo: true,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  let created = 0;
  for (const job of JOBS) {
    const result = await Job.updateOne(
      { user: user._id, title: job.title, company: job.company },
      {
        $setOnInsert: {
          user: user._id,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          requiredSkills: extractRequiredSkills(job.description),
          source: 'Seed',
        },
      },
      { upsert: true }
    );
    if (result.upsertedCount) created += 1;
  }

  const total = await Job.countDocuments({ user: user._id });

  console.log('\n  Seed complete');
  console.log(`  account  ${user.email}`);
  console.log(`  password ${PASSWORD}`);
  console.log(`  jobs     ${created} created, ${total} total for this account\n`);
}

run()
  .then(() => mongoose.connection.close())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('\n  Seed failed:', err.message);
    console.error('  (Is MONGODB_URI reachable from here?)\n');
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  });
