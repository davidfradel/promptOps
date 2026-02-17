import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { prisma } from './lib/prisma.js';
import { redis } from './lib/redis.js';
import { createWorker } from './services/queue/worker.js';

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Server started');
});

const worker = createWorker();

async function shutdown() {
  logger.info('Shutting down gracefully...');
  server.close();
  await worker.close();
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
