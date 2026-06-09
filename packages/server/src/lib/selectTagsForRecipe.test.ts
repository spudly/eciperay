import {jest} from '@jest/globals';
import type Anthropic from '@anthropic-ai/sdk';
import type {RecipeImport} from '@recipoo/types';

import {selectTagIdsForRecipe} from './selectTagsForRecipe.js';

const recipe: RecipeImport = {
  title: 'Spaghetti Carbonara',
  description: 'Classic Roman pasta',
  servings: 4,
  prepTimeMin: 10,
  cookTimeMin: 20,
  sourceUrl: null,
  ingredients: [
    {
      sortOrder: 0,
      name: 'spaghetti',
      quantity: 400,
      unit: 'g',
      notes: null,
      isOptional: false,
    },
    {
      sortOrder: 1,
      name: 'eggs',
      quantity: 4,
      unit: null,
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [{stepNumber: 1, body: 'Cook pasta and mix with eggs'}],
};

const availableTags = [
  {id: 'tag-dinner', name: 'Dinner'},
  {id: 'tag-italian', name: 'Italian'},
  {id: 'tag-dessert', name: 'Dessert'},
];

const makeClient = (text: string): Anthropic => {
  const create = jest
    .fn<() => Promise<Anthropic.Message>>()
    .mockResolvedValue({
      content: [{type: 'text', text}],
    } as unknown as Anthropic.Message);
  return {messages: {create}} as unknown as Anthropic;
};

describe('selectTagIdsForRecipe', () => {
  test('returns matching tag ids from AI-selected names', async () => {
    const client = makeClient(JSON.stringify(['Dinner', 'Italian']));
    await expect(
      selectTagIdsForRecipe(recipe, availableTags, client),
    ).resolves.toEqual(['tag-dinner', 'tag-italian']);
  });

  test('matches tag names case-insensitively', async () => {
    const client = makeClient(JSON.stringify(['dinner', 'ITALIAN']));
    await expect(
      selectTagIdsForRecipe(recipe, availableTags, client),
    ).resolves.toEqual(['tag-dinner', 'tag-italian']);
  });

  test('returns an empty array when no tags are available', async () => {
    const client = makeClient(JSON.stringify(['Dinner']));
    await expect(selectTagIdsForRecipe(recipe, [], client)).resolves.toEqual(
      [],
    );
  });

  test('returns an empty array when AI response is invalid', async () => {
    const client = makeClient('not json');
    await expect(
      selectTagIdsForRecipe(recipe, availableTags, client),
    ).resolves.toEqual([]);
  });

  test('returns an empty array when AI returns a non-text block', async () => {
    const create = jest
      .fn<() => Promise<Anthropic.Message>>()
      .mockResolvedValue({
        content: [{type: 'tool_use', id: 'x'}],
      } as unknown as Anthropic.Message);
    const client = {messages: {create}} as unknown as Anthropic;
    await expect(
      selectTagIdsForRecipe(recipe, availableTags, client),
    ).resolves.toEqual([]);
  });
});
