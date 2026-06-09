import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env['ANTHROPIC_API_KEY'],
});

export const HAIKU = 'claude-3-5-haiku-20241022' as const;
export const SONNET = 'claude-3-5-sonnet-20241022' as const;
