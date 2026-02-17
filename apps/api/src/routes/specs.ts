import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendCreated } from '../lib/response.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, SpecFormat } from '@promptops/shared';
import { enqueueGenerateJob } from '../services/queue/jobs.js';

export const specsRouter = Router();

const createSpecSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(500),
  content: z.string(),
  format: z.nativeEnum(SpecFormat).default('MARKDOWN'),
});

const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  projectId: z.string().optional(),
});

specsRouter.get('/', async (req, res) => {
  const { cursor, limit, projectId } = paginationSchema.parse(req.query);

  const specs = await prisma.spec.findMany({
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    ...(projectId ? { where: { projectId } } : {}),
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
  const spec = await prisma.spec.findUnique({ where: { id: req.params['id'] } });
  if (!spec) throw new NotFoundError('Spec', req.params['id']!);
  sendSuccess(res, spec);
});

specsRouter.post('/', async (req, res) => {
  const result = createSpecSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.message);

  const spec = await prisma.spec.create({ data: result.data });
  sendCreated(res, spec);
});

specsRouter.patch('/:id', async (req, res) => {
  const result = createSpecSchema.partial().safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.message);

  const spec = await prisma.spec.update({
    where: { id: req.params['id'] },
    data: result.data,
  });
  sendSuccess(res, spec);
});

specsRouter.delete('/:id', async (req, res) => {
  await prisma.spec.delete({ where: { id: req.params['id'] } });
  sendSuccess(res, { deleted: true });
});

const generateSpecSchema = z.object({
  projectId: z.string(),
  format: z.nativeEnum(SpecFormat).default('MARKDOWN'),
  title: z.string().optional(),
});

specsRouter.post('/generate', async (req, res) => {
  const result = generateSpecSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.message);

  const { projectId, format, title } = result.data;

  // Verify project exists
  const project = await prisma.project.findUnique({ where: { id: projectId } });
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
