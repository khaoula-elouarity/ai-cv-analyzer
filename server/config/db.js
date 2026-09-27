const mongoose = require('mongoose');
const env = require('./env');

// Fail fast on invalid queries instead of silently returning nothing.
mongoose.set('strictQuery', true);

/**
 * @param {string} [uri] Override the connection string (used by tests).
 */
const connectDB = async (uri = env.mongoUri) => {
  // Atlas DNS (SRV/TXT) resolves intermittently, and a single failed lookup
  // used to kill the whole process. Retry with backoff so a transient blip
  // does not take the API down — otherwise every request fails to connect
  // and the login flow dies with it.
  const attempts = 5;
  let lastErr;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 30_000,
        maxPoolSize: 10,
        autoIndex: !env.isProd,
      });
      if (attempt > 1) console.log(`[db] connected on attempt ${attempt}`);
      console.log(`[db] MongoDB connected -> ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (err) {
      lastErr = err;
      console.error(`[db] connection attempt ${attempt}/${attempts} failed: ${err.message}`);
      if (attempt < attempts) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
      }
    }
  }

  throw lastErr;
};

const disconnectDB = async () => {
  await mongoose.connection.close();
  console.log('[db] MongoDB connection closed');
};

/** Graceful shutdown so in-flight requests finish before the process exits. */
const handleTermination = (server) => {
  const shutdown = async (signal) => {
    console.log(`\n[server] ${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[server] Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

module.exports = { connectDB, disconnectDB, handleTermination };
