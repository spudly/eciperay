import type {RecipeImport} from '@recipoo/types';

import {anthropic as defaultAnthropic, SONNET} from './anthropic.js';

type AnthropicClient = typeof defaultAnthropic;

const SYSTEM_PROMPT = `You are a recipe parser. Given raw webpage text, extract the recipe
and return ONLY valid JSON matching this exact shape (no markdown, no explanation):
{
  "title": string,
  "description": string | null,
  "servings": number,
  "prepTimeMin": number | null,
  "cookTimeMin": number | null,
  "ingredients": [{"sortOrder": number, "name": string, "quantity": number|null, "unit": string|null, "notes": string|null, "isOptional": false}],
  "instructions": [{"stepNumber": number, "body": string}]
}`;

const callClaude = (text: string, client: AnthropicClient) =>
  client.messages.create({
    model: SONNET,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{role: 'user', content: text.slice(0, 12_000)}],
  });

const extractText = (
  content: Awaited<ReturnType<typeof callClaude>>['content'][number],
): string => {
  /* c8 ignore next 3 */
  if (content.type !== 'text') {
    throw new Error('Unexpected Claude response type');
  }
  return content.text;
};

export const parseWithClaude = async (
  pageText: string,
  sourceUrl: string,
  client: AnthropicClient = defaultAnthropic,
): Promise<RecipeImport> => {
  const message = await callClaude(pageText, client);
  const first = message.content[0];
  /* c8 ignore next 3 */
  if (!first) {
    throw new Error('Empty Claude response');
  }
  const text = extractText(first);
  const parsed = JSON.parse(text) as RecipeImport;
  return {...parsed, sourceUrl};
};
