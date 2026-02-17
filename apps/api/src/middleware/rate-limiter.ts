import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    data: null,
    error: { message: 'Too many requests, please try again later', code: 'RATE_LIMITED' },
    meta: null,
  },
});
