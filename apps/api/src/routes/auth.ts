import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendCreated } from '../lib/response.js';
import { ConflictError, AuthError } from '../lib/errors.js';
import { hashPassword, comparePassword, signToken } from '../lib/auth.js';
import { authMiddleware } from '../middleware/auth.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function sanitizeUser(user: { id: string; email: string; name: string | null; onboardedAt: Date | null; createdAt: Date; updatedAt: Date }) {
  return { id: user.id, email: user.email, name: user.name, onboardedAt: user.onboardedAt, createdAt: user.createdAt, updatedAt: user.updatedAt };
}

authRouter.post('/register', async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) throw new AuthError(result.error.message);

  const { email, password, name } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ConflictError('Email already registered');

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  const token = signToken(user.id);

  sendCreated(res, { token, user: sanitizeUser(user) });
});

authRouter.post('/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) throw new AuthError(result.error.message);

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AuthError('Invalid email or password');

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw new AuthError('Invalid email or password');

  const token = signToken(user.id);

  sendSuccess(res, { token, user: sanitizeUser(user) });
});

authRouter.get('/me', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw new AuthError('User not found');

  sendSuccess(res, sanitizeUser(user));
});
