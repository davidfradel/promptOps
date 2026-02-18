import { prisma } from '../../lib/prisma.js';
import { askClaude } from '../../utils/claude.js';
import { logger } from '../../utils/logger.js';

export async function generateSpec(projectId: string, specId?: string): Promise<void> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { sources: true },
  });

  // Load top 50 insights by severity
  const insights = await prisma.insight.findMany({
    where: { projectId },
    orderBy: { severity: 'desc' },
    take: 50,
  });

  // If specId provided, load the spec to get its format
  const spec = specId ? await prisma.spec.findUnique({ where: { id: specId } }) : null;

  const format = spec?.format ?? 'MARKDOWN';

  const insightSummaries = insights.map((i) => ({
    type: i.type,
    title: i.title,
    description: i.description,
    severity: i.severity,
    tags: i.tags,
  }));

  const systemPrompt = getSystemPrompt(format);

  const userPrompt = `Generate a product spec for the following project:

Project: ${project.name}
Description: ${project.description ?? 'N/A'}
Niche: ${project.niche ?? 'General'}
Keywords: ${project.keywords.join(', ')}
Sources: ${project.sources.map((s) => `${s.platform}: ${s.url}`).join(', ')}

Based on ${insights.length} analyzed insights:
${JSON.stringify(insightSummaries, null, 2)}`;

  logger.info({ projectId, format, insightCount: insights.length }, 'Generating spec');

  const content = await askClaude(systemPrompt, userPrompt, {
    temperature: 0.5,
    maxTokens: 8192,
  });

  if (spec) {
    // Update existing spec (replacing "Generating..." placeholder)
    await prisma.spec.update({
      where: { id: spec.id },
      data: {
        content,
        title: spec.title === 'Generating...' ? `${project.name} — Product Spec` : spec.title,
      },
    });
  } else {
    // Create new spec
    await prisma.spec.create({
      data: {
        projectId,
        title: `${project.name} — Product Spec`,
        content,
        format: format as 'MARKDOWN' | 'CLAUDE_CODE' | 'LINEAR',
      },
    });
  }

  logger.info({ projectId, specId: spec?.id }, 'Spec generation completed');
}

function getSystemPrompt(format: string): string {
  switch (format) {
    case 'CLAUDE_CODE':
      return `You are a senior software architect. Generate a comprehensive product spec structured for AI-assisted development. Include these sections:

1. Requirements — Functional and non-functional requirements
2. Architecture — System design, tech stack recommendations, component diagram
3. Implementation Plan — Phased approach with milestones
4. File Structure — Recommended project layout
5. API Design — Endpoints, request/response schemas
6. Data Models — Database schema, relationships

Use clear markdown formatting with code blocks for technical details.`;

    case 'LINEAR':
      return `You are a project manager. Generate a product spec formatted as Linear issues. Each section should be an issue with:

- Title (concise, actionable)
- Priority: P0 (Critical), P1 (High), P2 (Medium), P3 (Low)
- Estimate: XS (1h), S (half day), M (1 day), L (3 days), XL (1 week)
- Labels: relevant categories
- Acceptance Criteria: checkbox list

Group issues by epic/theme. Use markdown formatting.`;

    default: // MARKDOWN
      return `You are a product strategist. Generate a comprehensive product specification document. Include these sections:

1. Executive Summary
2. Problem Statement — What problems are users facing?
3. User Personas — Key user types and their needs
4. Core Features — Prioritized feature list with descriptions
5. Technical Requirements — Infrastructure, integrations, constraints
6. Success Metrics — KPIs and measurement approach
7. Risks & Mitigations
8. Timeline & Milestones

Use clear markdown formatting. Be specific and actionable based on the research data provided.`;
  }
}
