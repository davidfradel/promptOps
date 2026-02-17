import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

interface AskClaudeOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function askClaude(
  system: string,
  user: string,
  options: AskClaudeOptions = {},
): Promise<string> {
  const { model = 'claude-sonnet-4-5-20250929', maxTokens = 4096, temperature = 0.7 } = options;

  logger.debug({ system: system.slice(0, 100), user: user.slice(0, 100) }, 'Calling Claude API');

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock?.text ?? '';
}
