import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env['ANTHROPIC_API_KEY'],
  maxRetries: 4,
  fetch: globalThis.fetch,
});

export const HAIKU = 'claude-haiku-4-5' as const;
export const SONNET = 'claude-sonnet-4-6' as const;
