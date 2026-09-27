/**
 * Centralised, validated environment configuration.
 * Importing this module guarantees the process fails fast on bad config
 * instead of throwing obscure errors deep inside a request handler.
 */
const crypto = require('crypto');

const required = (key, fallback) => {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(
      `Missing required environment variable: ${key}. Copy .env.example to .env and fill it in.`
    );
  }
  return value;
};

const isProd = process.env.NODE_ENV === 'production';

const env = {
  isProd,
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  mongoUri: required('MONGO_URI'),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  // Comma separated list of extra origins allowed to send credentialed requests.
  extraOrigins: (process.env.ADDITIONAL_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  // "lax" works when the API and client share a site (single-domain deploys).
  // Set to "none" when the client is on a different site than the API
  // (e.g. Vercel -> Render/Railway), which forces Secure cookies.
  cookieSameSite: process.env.COOKIE_SAMESITE || (isProd ? 'none' : 'lax'),
  cookieSecure: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === 'true'
    : isProd,

  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 5),

  // ---------- OCR (scanned / photographed CVs) ----------
  // Tesseract fetches `eng.traineddata` (~15 MB) from a CDN on first use and
  // caches it here, so only the first image upload of a cold deploy is slow.
  // Turn off to reject image uploads outright and save the ~15 MB WASM core.
  ocrEnabled: process.env.OCR_ENABLED !== 'false',
  ocrLang: process.env.OCR_LANG || 'eng',
  ocrCacheDir: process.env.OCR_CACHE_DIR || '.ocr-cache',
  /** Local directory or URL of the language data, for offline deployments. */
  ocrLangPath: process.env.OCR_LANG_PATH || '',
  /**
   * Budget for a single recognition. A normal A4 page takes ~2 s, so this is
   * generous headroom for large photos.
   */
  ocrTimeoutMs: Number(process.env.OCR_TIMEOUT_MS || 30_000),
  /**
   * Budget for booting the worker, which is a *different* cost: on a cold
   * cache Tesseract downloads ~3 MB of language data, which can take minutes
   * on a slow link. Worth waiting out, because the next request is ~1.4 s.
   */
  ocrInitTimeoutMs: Number(process.env.OCR_INIT_TIMEOUT_MS || 180_000),
  /**
   * How long to stop retrying after a failed boot. Kept generous because a
   * failed init can leave an orphaned worker child behind, so retrying on every
   * request would accumulate processes.
   */
  ocrRetryCooldownMs: Number(process.env.OCR_RETRY_COOLDOWN_MS || 300_000),
  /**
   * Guards against OCR-ing a huge phone photo. Defaults to the same cap multer
   * enforces, so raising it only has an effect alongside MAX_UPLOAD_MB —
   * otherwise multer rejects the upload first and this never runs.
   */
  ocrMaxImageMb: Number(
    process.env.OCR_MAX_IMAGE_MB || process.env.MAX_UPLOAD_MB || 5
  ),

  aiProvider: (process.env.AI_PROVIDER || 'auto').toLowerCase(),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  xaiApiKey: process.env.XAI_API_KEY || '',
  xaiModel: process.env.XAI_MODEL || 'grok-4.7',

  // Serve /uploads as public static files. Turn OFF in production if you
  // would rather stream resumes through an authenticated route only.
  publicUploads: process.env.PUBLIC_UPLOADS !== 'false',
};

/** Never log secrets. Call this on boot for a safe config summary. */
env.safeSummary = () => ({
  nodeEnv: env.nodeEnv,
  port: env.port,
  clientUrl: env.clientUrl,
  cookieSameSite: env.cookieSameSite,
  cookieSecure: env.cookieSecure,
  aiProvider:
    env.aiProvider === 'auto'
      ? env.resolveAiProvider()
      : env.aiProvider,
  aiConfigured: Boolean(
    env.openaiApiKey || env.groqApiKey || env.xaiApiKey
  ),
});

/** Pick the first provider that actually has a key when AI_PROVIDER=auto. */
env.resolveAiProvider = () => {
  if (env.aiProvider !== 'auto') return env.aiProvider;
  if (env.groqApiKey) return 'groq';
  if (env.openaiApiKey) return 'openai';
  if (env.xaiApiKey) return 'xai';
  return 'local';
};

/** Random secret for local dev only — never used in production. */
env.generateSecret = () => crypto.randomBytes(48).toString('hex');

module.exports = env;
