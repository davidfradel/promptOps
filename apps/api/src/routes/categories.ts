import { Router } from 'express';
import { CATEGORIES } from '@promptops/shared';
import { sendSuccess } from '../lib/response.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', (_req, res) => {
  sendSuccess(res, CATEGORIES);
});
