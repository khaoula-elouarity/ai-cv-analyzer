require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const env = require('./config/env');
const { connectDB, handleTermination } = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { isOriginAllowed } = require('./middleware/csrf');

const authRoutes = require('./routes/authRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const analysisRoutes = require('./routes/analysisRoutes');
const jobRoutes = require('./routes/jobRoutes');

const app = express();

// Trust the first proxy hop so express-rate-limit and secure cookies behave
// correctly behind Render/Railway/nginx. Set to 1, not true, to avoid a
// client spoofing X-Forwarded-For.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// --- Security headers -----------------------------------------------------
app.use(
  helmet({
    // Resumes are downloaded from this origin in a <iframe>/<a>; the default
    // same-origin policy would block that once the client is on another host.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: env.isProd ? undefined : false,
  })
);

// --- CORS with credentials ------------------------------------------------
app.use(
  cors({
    // Uses the same predicate as the CSRF guard, so the two can never drift.
    // Rejecting with `false` (rather than an Error) is deliberate: it omits
    // the CORS headers and lets the request 403 as a normal ApiError instead
    // of surfacing an opaque 500.
    origin(origin, callback) {
      callback(null, isOriginAllowed(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

// --- Body parsing ---------------------------------------------------------
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

if (env.isProd) app.use(morgan('combined'));
else app.use(morgan('dev'));

// --- Static uploads -------------------------------------------------------
// Filenames are 12 random bytes, so the URL itself is the access token.
// Set PUBLIC_UPLOADS=false to disable this and stream files via an
// authenticated route instead.
if (env.publicUploads) {
  app.use(
    '/uploads',
    express.static(path.resolve(__dirname, env.uploadDir), {
      index: false,
      dotfiles: 'deny',
      maxAge: '1h',
      setHeaders(res) {
        // Never let a browser render an uploaded file inline as HTML.
        res.setHeader('Content-Disposition', 'attachment');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    })
  );
}

// --- Rate limiting --------------------------------------------------------
app.use('/api', apiLimiter);

// --- Routes ---------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    uptime: Math.round(process.uptime()),
    database: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
    aiEngine: env.resolveAiProvider(),
    ocr: require('./services/ocrService').status(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
// Alias so both /api/resume and /api/resumes resolve. The client uses the
// singular form; the plural reads more naturally, so both are accepted.
app.use('/api/resumes', resumeRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/jobs', jobRoutes);

app.get('/', (req, res) => {
  res.json({
    name: 'MERN AI CV Analyzer & Smart Job Matcher API',
    version: '1.0.0',
    docs: '/api/health',
  });
});

// --- Error handling -------------------------------------------------------
app.use(notFound);
app.use(errorHandler);

// --- Boot -----------------------------------------------------------------
const start = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error('[boot] Could not connect to MongoDB:', err.message);
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(`[server] listening on port ${env.port} (${env.nodeEnv})`);
    console.log('[server] config:', env.safeSummary());
    if (env.resolveAiProvider() === 'local') {
      console.log(
        '[server] No AI provider key set — using the built-in local analysis engine. ' +
          'Set GROQ_API_KEY (free) or OPENAI_API_KEY to enable LLM analysis.'
      );
    }
  });

  handleTermination(server);
  return server;
};

// Only auto-start when run directly, so tests can import the app.
if (require.main === module) start();

module.exports = app;
