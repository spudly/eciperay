import type Anthropic from '@anthropic-ai/sdk';
import type {RecipeImport} from '@eciperay/types';

import {anthropic as defaultAnthropic, SONNET} from './anthropic.js';
import {RecipeImportSchema, parseAiJson} from './schemas.js';

type AnthropicClient = typeof defaultAnthropic;

const SYSTEM_PROMPT = `You are a creative recipe developer. Given a user's description of the recipe they want, invent a complete, coherent, cookable recipe and return ONLY valid JSON matching this exact shape (no markdown, no explanation):
{
  "title": string,
  "description": string | null,
  "servings": number,
  "prepTimeMin": number | null,
  "cookTimeMin": number | null,
  "ingredients": [{"sortOrder": number, "name": string, "quantity": number|null, "unit": string|null, "notes": string|null, "isOptional": false}],
  "instructions": [{"stepNumber": number, "body": string}]
}
Respect constraints in the user's request (diet, time, servings, cuisine, skill level). Use realistic quantities and clear step-by-step instructions. Default servings to 4 if unspecified. Number ingredients with sortOrder starting at 0 and steps starting at 1. Include a brief appetizing description.`;

const extractText = (content: Anthropic.Message['content'][number]): string => {
  /* c8 ignore next 3 -- Claude returns non-text blocks only on API errors */
  if (content.type !== 'text') {
    throw new Error('Unexpected Claude response type');
  }
  return content.text;
};

export const generateRecipeWithClaude = async (
  prompt: string,
  client: AnthropicClient = defaultAnthropic,
): Promise<RecipeImport> => {
  const message = await client.messages.create({
    model: SONNET,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{role: 'user', content: prompt}],
  });
  const first = message.content[0];
  /* c8 ignore next 3 -- Claude returns empty content only on API errors */
  if (!first) {
    throw new Error('Empty Claude response');
  }
  const text = extractText(first);
  const parsed = parseAiJson(RecipeImportSchema, text);
  const trimmedDescription = parsed.description?.trim();
  return {
    ...parsed,
    description:
      trimmedDescription && trimmedDescription.length > 0
        ? trimmedDescription
        : null,
    sourceUrl: null,
  };
};
