// Verifies an Atlas credential end-to-end WITHOUT touching .env: connect,
// authenticate, then prove real access to the target database (auth can succeed
// while the user still lacks privileges on a given DB).
// Usage: node _atlas-auth-probe.tmp.js "<uri>"
const mongoose = require('mongoose');
const nodeDns = require('node:dns');

// The box resolves DNS via the router (192.168.1.1), which intermittently
// times out on Atlas SRV lookups. Point c-ares at public resolvers so a DNS
// blip is not mistaken for a bad credential.
if (process.env.USE_PUBLIC_DNS === '1') {
  nodeDns.setServers(['8.8.8.8', '1.1.1.1']);
  console.log('resolver: forced to 8.8.8.8 / 1.1.1.1');
}

const redact = (uri) => uri.replace(/\/\/([^:]+):([^@]+)@/, (_m, u) => `//${u}:***@`);

(async () => {
  const uri = process.argv[2];
  if (!uri) {
    console.error('no uri given');
    process.exit(2);
  }
  console.log('target:', redact(uri));

  const client = mongoose.createConnection
    ? null
    : null;

  const conn = await mongoose
    .createConnection(uri, {
      serverSelectionTimeoutMS: 15_000,
      connectTimeoutMS: 10_000,
    })
    .asPromise()
    .catch((e) => {
      console.log('CONNECT FAILED:', e.name, '-', String(e.message).split('\n')[0]);
      if (/bad auth|Authentication failed/i.test(e.message)) {
        console.log('  -> credentials rejected by Atlas');
      }
      if (/queryTxt|querySrv|ETIMEDOUT|ENOTFOUND/i.test(e.message)) {
        console.log('  -> DNS lookup problem, NOT a credential problem');
      }
      return null;
    });

  if (!conn) process.exit(1);

  console.log('CONNECTED  host=' + conn.host + '  db=' + conn.name);

  // Proves the user can actually read the app database, not just log in.
  try {
    const cols = await conn.db.listCollections().toArray();
    console.log(
      'DB ACCESS OK — collections in "' + conn.name + '":',
      cols.length ? cols.map((c) => c.name).join(', ') : '(empty — first run)'
    );
  } catch (e) {
    console.log('DB ACCESS FAILED:', e.message.split('\n')[0]);
    console.log('  -> authenticated, but not authorized on this database');
  }

  await conn.close();
  process.exit(0);
})();
