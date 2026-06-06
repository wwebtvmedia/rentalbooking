// Local development launcher for bestflats.vip backend.
// Boots an in-memory MongoDB replica set (so transactions work) and then starts
// the Express app from src/index.js. Bound to 0.0.0.0 so it is reachable on the LAN IP.
//
// Required env (exported by start-local.sh from the repo .env):
//   AUTH_JWT_SECRET, MASTER_ENCRYPTION_KEY, PLATFORM_ADMIN_KEY
// Optional: GOOGLE_CLIENT_ID, PORT (default 4000)
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { logger } from '../src/logger.js';

const replSet = await MongoMemoryReplSet.create({
  replSet: { count: 1, storageEngine: 'wiredTiger' },
});
process.env.MONGO_URI = replSet.getUri('bestflats');
logger.info({ uri: process.env.MONGO_URI }, 'LOCAL: in-memory Mongo replica set started');

// Importing index.js starts the HTTP server (app.listen binds 0.0.0.0 by default).
await import('../src/index.js');

const shutdown = async (signal) => {
  logger.info({ signal }, 'LOCAL: shutting down, stopping in-memory Mongo');
  try { await replSet.stop(); } catch (e) { /* ignore */ }
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
