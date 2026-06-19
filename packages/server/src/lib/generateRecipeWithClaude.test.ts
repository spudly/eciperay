import {jest} from '@jest/globals';
import type Anthropic from '@anthropic-ai/sdk';

import {generateRecipeWithClaude} from './generateRecipeWithClaude.js';

const VALID_RECIPE = {
  title: 'Chocolate Chip Cookies',
  description: 'Classic chewy cookies.',
  servings: 12,
  prepTimeMin: 15,
  cookTimeMin: 12,
  ingredients: [
    {
      sortOrder: 0,
      name: 'flour',
      quantity: 2,
      unit: 'cups',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [{stepNumber: 1, body: 'Mix and bake'}],
};

type Content = {type: string; text?: string; id?: string};

const makeClient = (content: Content[]): Anthropic => {
  const response = {content} as unknown as Anthropic.Message;
  const create = jest
    .fn<() => Promise<Anthropic.Message>>()
    .mockResolvedValue(response);
  return {messages: {create}} as unknown as Anthropic;
};

describe('generateRecipeWithClaude', () => {
  test('returns a generated RecipeImport with sourceUrl null', async () => {
    const client = makeClient([
      {type: 'text', text: JSON.stringify(VALID_RECIPE)},
    ]);
    const result = await generateRecipeWithClaude(
      'simple chocolate chip cookies for 12',
      client,
    );
    expect(result.title).toBe('Chocolate Chip Cookies');
    expect(result.servings).toBe(12);
    expect(result.sourceUrl).toBeNull();
  });

  test('throws when Anthropic returns a non-text content block', async () => {
    const client = makeClient([{type: 'tool_use', id: 'x'}]);
    await expect(
      generateRecipeWithClaude('quick pasta', client),
    ).rejects.toThrow();
  });

  test('parses JSON wrapped in markdown code fences', async () => {
    const client = makeClient([
      {
        type: 'text',
        text: `\`\`\`json\n${JSON.stringify(VALID_RECIPE)}\n\`\`\``,
      },
    ]);
    const result = await generateRecipeWithClaude('cookies', client);
    expect(result.title).toBe('Chocolate Chip Cookies');
  });

  test('throws when Anthropic returns an empty content array', async () => {
    const client = makeClient([]);
    await expect(
      generateRecipeWithClaude('quick pasta', client),
    ).rejects.toThrow();
  });

  test('normalizes blank descriptions to null', async () => {
    const client = makeClient([
      {
        type: 'text',
        text: JSON.stringify({...VALID_RECIPE, description: '   '}),
      },
    ]);
    const result = await generateRecipeWithClaude('cookies', client);
    expect(result.description).toBeNull();
  });
});
