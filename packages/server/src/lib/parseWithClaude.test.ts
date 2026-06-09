import {jest} from '@jest/globals';
import type Anthropic from '@anthropic-ai/sdk';

import {parseWithClaude} from './parseWithClaude.js';

const VALID_RECIPE = {
  title: 'Pasta',
  description: null,
  servings: 4,
  prepTimeMin: null,
  cookTimeMin: null,
  sourceUrl: null,
  ingredients: [
    {
      sortOrder: 0,
      name: 'Pasta',
      quantity: 200,
      unit: 'g',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [{stepNumber: 1, body: 'Boil water'}],
};

type Content = {type: string; text?: string; id?: string};

const makeClient = (content: Content[]): Anthropic => {
  const response = {content} as unknown as Anthropic.Message;
  const create = jest
    .fn<() => Promise<Anthropic.Message>>()
    .mockResolvedValue(response);
  return {messages: {create}} as unknown as Anthropic;
};

describe('parseWithClaude', () => {
  test('returns a parsed RecipeImport on a valid text response', async () => {
    const client = makeClient([
      {type: 'text', text: JSON.stringify(VALID_RECIPE)},
    ]);
    const result = await parseWithClaude(
      'some page text',
      'https://example.com',
      client,
    );
    expect(result.title).toBe('Pasta');
    expect(result.servings).toBe(4);
    expect(result.sourceUrl).toBe('https://example.com');
  });

  test('throws when Anthropic returns a non-text content block', async () => {
    const client = makeClient([{type: 'tool_use', id: 'x'}]);
    await expect(
      parseWithClaude('text', 'https://example.com', client),
    ).rejects.toThrow();
  });

  test('throws when Anthropic returns an empty content array', async () => {
    const client = makeClient([]);
    await expect(
      parseWithClaude('text', 'https://example.com', client),
    ).rejects.toThrow();
  });
});
