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

  test('accepts responses that omit sourceUrl', async () => {
    const {sourceUrl, ...withoutSourceUrl} = VALID_RECIPE;
    const client = makeClient([
      {type: 'text', text: JSON.stringify(withoutSourceUrl)},
    ]);
    const result = await parseWithClaude('some page text', null, client);
    expect(result.title).toBe('Pasta');
    expect(result.sourceUrl).toBeNull();
  });

  test('parses JSON wrapped in markdown code fences', async () => {
    const client = makeClient([
      {
        type: 'text',
        text: `\`\`\`json\n${JSON.stringify(VALID_RECIPE)}\n\`\`\``,
      },
    ]);
    const result = await parseWithClaude(
      'some page text',
      'https://example.com',
      client,
    );
    expect(result.title).toBe('Pasta');
  });

  test('throws when Anthropic returns an empty content array', async () => {
    const client = makeClient([]);
    await expect(
      parseWithClaude('text', 'https://example.com', client),
    ).rejects.toThrow();
  });

  test('leaves description null when generated description is blank', async () => {
    const create = jest
      .fn<() => Promise<Anthropic.Message>>()
      .mockResolvedValueOnce({
        content: [{type: 'text', text: JSON.stringify(VALID_RECIPE)}],
      } as unknown as Anthropic.Message)
      .mockResolvedValueOnce({
        content: [{type: 'text', text: '   '}],
      } as unknown as Anthropic.Message);
    const client = {messages: {create}} as unknown as Anthropic;
    const result = await parseWithClaude('some page text', null, client);
    expect(result.description).toBeNull();
  });

  test('leaves description null when description generation returns non-text', async () => {
    const create = jest
      .fn<() => Promise<Anthropic.Message>>()
      .mockResolvedValueOnce({
        content: [{type: 'text', text: JSON.stringify(VALID_RECIPE)}],
      } as unknown as Anthropic.Message)
      .mockResolvedValueOnce({
        content: [{type: 'tool_use', id: 'x'}],
      } as unknown as Anthropic.Message);
    const client = {messages: {create}} as unknown as Anthropic;
    const result = await parseWithClaude('some page text', null, client);
    expect(result.description).toBeNull();
  });

  test('generates a description when the parsed recipe has none', async () => {
    const create = jest
      .fn<() => Promise<Anthropic.Message>>()
      .mockResolvedValueOnce({
        content: [{type: 'text', text: JSON.stringify(VALID_RECIPE)}],
      } as unknown as Anthropic.Message)
      .mockResolvedValueOnce({
        content: [
          {type: 'text', text: 'A simple pasta dish boiled to perfection.'},
        ],
      } as unknown as Anthropic.Message);
    const client = {messages: {create}} as unknown as Anthropic;
    const result = await parseWithClaude('some page text', null, client);
    expect(result.description).toBe(
      'A simple pasta dish boiled to perfection.',
    );
    expect(create).toHaveBeenCalledTimes(2);
  });
});
