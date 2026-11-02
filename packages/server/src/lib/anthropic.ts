import Anthropic from '@anthropic-ai/sdk';

import {
  resolveAnthropicApiKey,
  resolveAnthropicFetch,
} from './fakeAnthropicFetch.js';

export const anthropic = new Anthropic({
  apiKey: resolveAnthropicApiKey(),
  maxRetries: 4,
  fetch: resolveAnthropicFetch(),
});

export const HAIKU = 'claude-haiku-4-5' as const;
export const SONNET = 'claude-sonnet-4-6' as const;
