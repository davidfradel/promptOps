import { Router } from 'express';
import { sendSuccess } from '../lib/response.js';
import { ValidationError } from '../lib/errors.js';
import { completeOnboarding } from '../services/onboarding.js';
import { onboardingSchema } from '@promptops/shared';

export const onboardingRouter = Router();

onboardingRouter.post('/', async (req, res) => {
  const result = onboardingSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.message);

  await completeOnboarding(req.userId!, result.data.categories);

  sendSuccess(res, { message: 'Onboarding completed' });
});
