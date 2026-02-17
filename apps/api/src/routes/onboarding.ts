import { Router } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../lib/response.js';
import { ValidationError } from '../lib/errors.js';
import { completeOnboarding } from '../services/onboarding.js';

export const onboardingRouter = Router();

const onboardingSchema = z.object({
  categories: z.array(z.string()).min(1, 'At least one category is required'),
});

onboardingRouter.post('/', async (req, res) => {
  const result = onboardingSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.message);

  await completeOnboarding(req.userId!, result.data.categories);

  sendSuccess(res, { message: 'Onboarding completed' });
});
