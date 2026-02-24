import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/env.js', () => ({
  env: { ANTHROPIC_API_KEY: 'test-key' },
}));

vi.mock('./logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// vi.hoisted ensures mockCreate is available when the mock factory runs (before imports)
const mockCreate = vi.hoisted(() => vi.fn());

vi.mock('@anthropic-ai/sdk', () => ({
  // Must use a regular function so 'new Anthropic()' works as a constructor
  default: vi.fn(function (this: { messages: { create: typeof mockCreate } }) {
    this.messages = { create: mockCreate };
  }),
}));

import { askClaude } from './claude.js';
import { logger } from './logger.js';

function makeResponse(text: string, inputTokens = 100, outputTokens = 200) {
  return {
    content: [{ type: 'text', text }],
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  };
}

describe('askClaude', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns text content from Claude response', async () => {
    mockCreate.mockResolvedValue(makeResponse('Hello, world!'));

    const result = await askClaude('system', 'user');

    expect(result).toBe('Hello, world!');
  });

  it('returns empty string when response has no text block', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'image' }],
      usage: { input_tokens: 10, output_tokens: 0 },
    });

    const result = await askClaude('system', 'user');

    expect(result).toBe('');
  });

  it('logs token usage after each call', async () => {
    mockCreate.mockResolvedValue(makeResponse('response', 150, 250));

    await askClaude('system', 'user');

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        inputTokens: 150,
        outputTokens: 250,
        totalTokens: 400,
      }),
      'Claude API usage',
    );
  });

  it('passes custom model, maxTokens, and temperature to the SDK', async () => {
    mockCreate.mockResolvedValue(makeResponse('ok'));

    await askClaude('sys', 'usr', {
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 1024,
      temperature: 0.1,
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        temperature: 0.1,
        system: 'sys',
        messages: [{ role: 'user', content: 'usr' }],
      }),
    );
  });

  it('uses default model and params when options are omitted', async () => {
    mockCreate.mockResolvedValue(makeResponse('ok'));

    await askClaude('sys', 'usr');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        temperature: 0.7,
      }),
    );
  });
});
