import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { router } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { logger } from './utils/logger.js';
import { env } from './config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(__dirname, '../../web/dist');

export const app = express();

// Railway runs behind a reverse proxy
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(
  cors({
    origin: env.NODE_ENV === 'production' ? env.CORS_ORIGINS.split(',') : true,
    credentials: true,
  }),
);
app.use(rateLimiter);
app.use(express.json({ limit: '100kb' }));
app.use(pinoHttp({ logger }));

app.use(router);

// Serve React SPA static assets
app.use(express.static(clientDistPath));

// SPA fallback — serve index.html for all non-API routes
app.get('{*path}', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.use(errorHandler);
