const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const ApiError = require('../utils/ApiError');

/**
 * `config/env` throws on a missing MONGO_URI, and it is required at module
 * load. Requiring it here instead of at the top of the file keeps this service
 * free of database configuration, so the standalone scripts under scripts/ can
 * exercise text extraction without a full environment.
 */
let cachedEnv = null;
const getEnv = () => {
  if (!cachedEnv) cachedEnv = require('../config/env');
  return cachedEnv;
};

/**
 * Tesseract downloads `eng.traineddata` from a CDN on first use and caches it
 * on disk. Its writer is a bare `fs.writeFile` that will not create the parent
 * directory, so a missing cache folder silently discards every download and
 * forces a re-fetch on each boot. Creating it up front is what makes the cache
 * work at all.
 */
let cachedDir = null;
const getCacheDir = () => {
  if (!cachedDir) {
    cachedDir = path.resolve(__dirname, '..', getEnv().ocrCacheDir);
    fs.mkdirSync(cachedDir, { recursive: true });
  }
  return cachedDir;
};

/** @type {Promise<object>|null} in-flight or settled worker init */
let workerPromise = null;
/** @type {object|null} the live worker, once init has resolved */
let worker = null;
/** Serialises `recognize` calls: the worker is single-threaded and has no queue. */
let queueTail = Promise.resolve();
/** Timestamp until which we refuse to retry a failed init. */
let retryAfter = 0;

/**
 * Reject with `message` if `promise` has not settled within `ms`.
 *
 * This is not defensive padding — it is required. `createWorker` chains its
 * init with `.catch(() => {})` (tesseract.js/src/createWorker.js), so a
 * failure to fetch the language data leaves the returned promise pending
 * *forever* rather than rejecting. Without this race the HTTP request would
 * hang until the client gave up.
 */
const withTimeout = (promise, ms, message) => {
  let timer;
  const guard = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
    // Do not hold the event loop open just for this timer.
    timer.unref?.();
  });

  return Promise.race([promise, guard]).finally(() => clearTimeout(timer));
};

const buildOptions = () => {
  const env = getEnv();
  const options = {
    cachePath: getCacheDir(),
    // Progress is only interesting during boot; silence it otherwise so the
    // request log stays readable.
    logger: () => {},
  };
  // Lets an offline/air-gapped deploy point at a local copy of the language
  // data instead of the default jsDelivr CDN.
  if (env.ocrLangPath) options.langPath = env.ocrLangPath;
  return options;
};

/**
 * Lazily create the shared worker, or return the existing one.
 *
 * Only one worker exists per process: booting Tesseract costs seconds and tens
 * of megabytes, so paying that per request is not viable.
 */
const getWorker = () => {
  if (workerPromise) return workerPromise;

  const env = getEnv();

  if (Date.now() < retryAfter) {
    return Promise.reject(
      ApiError.serviceUnavailable(
        'OCR is temporarily unavailable because its language data could not be loaded. Please try again shortly, or upload a text-based PDF.'
      )
    );
  }

  workerPromise = (async () => {
    // Required lazily so a deployment with OCR disabled never pays the
    // ~15 MB WASM/core load at require() time.
    const { createWorker } = require('tesseract.js');

    const created = await withTimeout(
      createWorker(env.ocrLang, undefined, buildOptions()),
      env.ocrInitTimeoutMs,
      'Timed out while initialising the OCR engine'
    );

    worker = created;
    // Tesseract's worker is a forked child process, and a child is not reaped
    // when its parent exits — without this it lingers on every deploy. A
    // separate 'exit' handler would be pointless: only synchronous work runs
    // during 'exit', and terminate() is async.
    const shutdown = () => {
      if (worker) created.terminate().catch(() => {});
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);

    return created;
  })();

  // Swallow rejection here so an unhandled rejection cannot crash the server;
  // every caller still receives the real error through their own await.
  workerPromise.catch((err) => {
    workerPromise = null;
    retryAfter = Date.now() + env.ocrRetryCooldownMs;
    console.error(
      '[ocr] worker init failed, pausing OCR for',
      Math.round(env.ocrRetryCooldownMs / 1000),
      's:',
      err?.message || err
    );
  });

  return workerPromise;
};

/**
 * Recognise text in an image file.
 *
 * @param {string} filePath Absolute path to a PNG/JPEG on disk.
 * @returns {Promise<{text: string, confidence: number, durationMs: number}>}
 */
const recognizeImage = async (filePath) => {
  const env = getEnv();

  if (!env.ocrEnabled) {
    throw ApiError.badRequest(
      'Image uploads are disabled on this server. Please upload a text-based PDF or .docx instead.'
    );
  }

  const { size } = await fsp.stat(filePath);
  const maxBytes = env.ocrMaxImageMb * 1024 * 1024;

  if (size > maxBytes) {
    throw ApiError.payloadTooLarge(
      `That image is ${(size / 1024 / 1024).toFixed(1)} MB. Images must be under ${env.ocrMaxImageMb} MB — try a lower-resolution photo or a text-based PDF.`
    );
  }

  const startedAt = Date.now();

  // Chain onto the tail so only one recognition occupies the worker at a time.
  const job = queueTail.then(async () => {
    const active = await getWorker();
    return active.recognize(filePath, {}, { text: true });
  });

  // Keep the chain alive even when this job fails, otherwise one bad image
  // would permanently poison the queue for every later request.
  queueTail = job.then(
    () => undefined,
    () => undefined
  );

  let result;
  try {
    result = await withTimeout(
      job,
      env.ocrTimeoutMs,
      'Timed out while reading text from the image'
    );
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error('[ocr] recognition failed:', err.message);
    throw ApiError.badRequest(
      'We could not read that image. Try a sharper, well-lit photo with the CV filling the frame, or upload a text-based PDF.'
    );
  }

  const text = result?.data?.text || '';
  const confidence = Math.round(result?.data?.confidence ?? 0);

  if (!text.trim()) {
    throw ApiError.badRequest(
      'No text could be read from that image. Please upload a text-based PDF or .docx — Applicant Tracking Systems cannot read scanned CVs reliably either.'
    );
  }

  return { text, confidence, durationMs: Date.now() - startedAt };
};

/** Release the worker. Used on shutdown and by tests. */
const shutdown = async () => {
  const active = worker;
  worker = null;
  workerPromise = null;
  if (active) await active.terminate().catch(() => {});
};

const status = () => {
  const env = getEnv();
  return {
    enabled: env.ocrEnabled,
    ready: Boolean(worker),
    lang: env.ocrLang,
    cacheDir: cachedDir || path.resolve(__dirname, '..', env.ocrCacheDir),
    coolingDown: Date.now() < retryAfter,
  };
};

module.exports = { recognizeImage, shutdown, status };
