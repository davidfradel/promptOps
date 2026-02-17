import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { router } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { logger } from './utils/logger.js';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(rateLimiter);
app.use(express.json());
app.use(pinoHttp({ logger }));

app.use(router);

app.use(errorHandler);
