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

export const app = express();

app.use(helmet());
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

app.use(errorHandler);
