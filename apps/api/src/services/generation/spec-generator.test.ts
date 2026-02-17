import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSpec } from './spec-generator.js';

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    project: { findUniqueOrThrow: vi.fn() },
    insight: { findMany: vi.fn() },
    spec: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('../../utils/claude.js', () => ({
  askClaude: vi.fn(),
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { prisma } from '../../lib/prisma.js';
import { askClaude } from '../../utils/claude.js';

describe('generateSpec', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.project.findUniqueOrThrow).mockResolvedValue({
      id: 'proj-1',
      name: 'Test Project',
      description: 'A test project',
      keywords: ['saas', 'ai'],
      niche: 'devtools',
      sources: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    vi.mocked(prisma.insight.findMany).mockResolvedValue([
      { id: 'ins-1', type: 'PAIN_POINT', title: 'Auth Issues', description: 'Login broken', severity: 0.8, tags: ['auth'] },
    ] as never);
  });

  it('should update existing spec when specId is provided', async () => {
    vi.mocked(prisma.spec.findUnique).mockResolvedValue({
      id: 'spec-1',
      projectId: 'proj-1',
      title: 'Generating...',
      content: 'Generating...',
      format: 'MARKDOWN',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(askClaude).mockResolvedValue('# Product Spec\n\nContent here...');
    vi.mocked(prisma.spec.update).mockResolvedValue({} as never);

    await generateSpec('proj-1', 'spec-1');

    expect(prisma.spec.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'spec-1' },
        data: expect.objectContaining({
          content: '# Product Spec\n\nContent here...',
          title: 'Test Project — Product Spec',
        }),
      }),
    );
    expect(prisma.spec.create).not.toHaveBeenCalled();
  });

  it('should create new spec when no specId is provided', async () => {
    vi.mocked(prisma.spec.findUnique).mockResolvedValue(null);
    vi.mocked(askClaude).mockResolvedValue('# New Spec');
    vi.mocked(prisma.spec.create).mockResolvedValue({} as never);

    await generateSpec('proj-1');

    expect(prisma.spec.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'proj-1',
          content: '# New Spec',
          format: 'MARKDOWN',
        }),
      }),
    );
  });

  it('should use CLAUDE_CODE system prompt for that format', async () => {
    vi.mocked(prisma.spec.findUnique).mockResolvedValue({
      id: 'spec-1', format: 'CLAUDE_CODE', title: 'Generating...', content: 'Generating...',
      projectId: 'proj-1', version: 1, createdAt: new Date(), updatedAt: new Date(),
    });

    vi.mocked(askClaude).mockResolvedValue('# Architecture');
    vi.mocked(prisma.spec.update).mockResolvedValue({} as never);

    await generateSpec('proj-1', 'spec-1');

    expect(askClaude).toHaveBeenCalledWith(
      expect.stringContaining('software architect'),
      expect.any(String),
      expect.objectContaining({ temperature: 0.5, maxTokens: 8192 }),
    );
  });

  it('should use LINEAR system prompt for that format', async () => {
    vi.mocked(prisma.spec.findUnique).mockResolvedValue({
      id: 'spec-1', format: 'LINEAR', title: 'Generating...', content: 'Generating...',
      projectId: 'proj-1', version: 1, createdAt: new Date(), updatedAt: new Date(),
    });

    vi.mocked(askClaude).mockResolvedValue('Issue 1');
    vi.mocked(prisma.spec.update).mockResolvedValue({} as never);

    await generateSpec('proj-1', 'spec-1');

    expect(askClaude).toHaveBeenCalledWith(
      expect.stringContaining('project manager'),
      expect.any(String),
      expect.any(Object),
    );
  });
});
