import type {RecipeImport} from '@recipoo/types';

import {anthropic as defaultAnthropic, HAIKU, SONNET} from './anthropic.js';
import {RecipeImportSchema} from './schemas.js';
import {parseAiJson} from './validate.js';

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
}
If the source text does not include a description, write a brief appetizing 1-2 sentence summary based on the recipe contents.`;

const callClaude = (text: string, client: AnthropicClient) =>
  client.messages.create({
    model: SONNET,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{role: 'user', content: text.slice(0, 12_000)}],
  });

const generateDescription = async (
  pageText: string,
  title: string,
  client: AnthropicClient,
) => {
  const message = await client.messages.create({
    model: HAIKU,
    max_tokens: 150,
    system:
      'Write one appetizing sentence describing the recipe. Return only the description text.',
    messages: [
      {
        role: 'user',
        content: `Recipe title: ${title}\n\nRecipe text:\n${pageText.slice(0, 3000)}`,
      },
    ],
  });
  const first = message.content[0];
  if (first?.type !== 'text') {
    return null;
  }
  const description = first.text.trim();
  return description.length > 0 ? description : null;
};

const extractText = (
  content: Awaited<ReturnType<typeof callClaude>>['content'][number],
): string => {
  /* c8 ignore next 3 -- Claude returns non-text blocks only on API errors */
  if (content.type !== 'text') {
    throw new Error('Unexpected Claude response type');
  }
  return content.text;
};

export const parseWithClaude = async (
  pageText: string,
  sourceUrl: string | null,
  client: AnthropicClient = defaultAnthropic,
): Promise<RecipeImport> => {
  const message = await callClaude(pageText, client);
  const first = message.content[0];
  /* c8 ignore next 3 -- Claude returns empty content only on API errors */
  if (!first) {
    throw new Error('Empty Claude response');
  }
  const text = extractText(first);
  const parsed = parseAiJson(RecipeImportSchema, text);
  const trimmedDescription = parsed.description?.trim();
  const description =
    trimmedDescription && trimmedDescription.length > 0
      ? trimmedDescription
      : await generateDescription(pageText, parsed.title, client);
  return {...parsed, description, sourceUrl};
};
