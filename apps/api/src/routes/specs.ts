import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendCreated } from '../lib/response.js';
import { NotFoundError, ValidationError, AuthError } from '../lib/errors.js';
import {
  createSpecSchema,
  generateSpecSchema,
  specPaginationSchema,
  cuidParamSchema,
} from '@promptops/shared';
import { enqueueGenerateJob } from '../services/queue/jobs.js';

export const specsRouter = Router();

specsRouter.get('/', async (req, res) => {
  const { cursor, limit, projectId } = specPaginationSchema.parse(req.query);

  const where = {
    project: { userId: req.userId },
    ...(projectId ? { projectId } : {}),
  };

  const specs = await prisma.spec.findMany({
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    where,
    orderBy: { createdAt: 'desc' },
  });

  const hasMore = specs.length > limit;
  if (hasMore) specs.pop();

  sendSuccess(res, specs, {
    cursor: specs.at(-1)?.id ?? null,
    hasMore,
  });
});

specsRouter.get('/:id', async (req, res) => {
  const { id } = cuidParamSchema.parse(req.params);

  const spec = await prisma.spec.findFirst({
    where: { id, project: { userId: req.userId } },
  });
  if (!spec) throw new NotFoundError('Spec', id);
  sendSuccess(res, spec);
});

specsRouter.post('/', async (req, res) => {
  const result = createSpecSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.message);

  const project = await prisma.project.findFirst({
    where: { id: result.data.projectId, userId: req.userId },
  });
  if (!project) throw new AuthError('Project not found or access denied');

  const spec = await prisma.spec.create({ data: result.data });
  sendCreated(res, spec);
});

specsRouter.patch('/:id', async (req, res) => {
  const { id } = cuidParamSchema.parse(req.params);

  const result = createSpecSchema.partial().safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.message);

  const existing = await prisma.spec.findFirst({
    where: { id, project: { userId: req.userId } },
  });
  if (!existing) throw new NotFoundError('Spec', id);

  const spec = await prisma.spec.update({
    where: { id: existing.id },
    data: result.data,
  });
  sendSuccess(res, spec);
});

specsRouter.delete('/:id', async (req, res) => {
  const { id } = cuidParamSchema.parse(req.params);

  const existing = await prisma.spec.findFirst({
    where: { id, project: { userId: req.userId } },
  });
  if (!existing) throw new NotFoundError('Spec', id);

  await prisma.spec.delete({ where: { id: existing.id } });
  sendSuccess(res, { deleted: true });
});

specsRouter.post('/generate', async (req, res) => {
  const result = generateSpecSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.message);

  const { projectId, format, title } = result.data;

  // Verify project exists and belongs to user
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: req.userId },
  });
  if (!project) throw new NotFoundError('Project', projectId);

  // Create placeholder spec
  const spec = await prisma.spec.create({
    data: {
      projectId,
      title: title ?? 'Generating...',
      content: 'Generating...',
      format,
    },
  });

  await enqueueGenerateJob(projectId, spec.id);

  sendCreated(res, spec);
});
