import {jest} from '@jest/globals';
import type {RecipeImport} from '@eciperay/types';

import {createMockQuery} from '../test/mockQuery.js';
import {makeQueryResult} from '../test/fixtures/queryResult.js';

import {prepareImportedRecipeInput} from './prepareImportedRecipeInput.js';

const recipe: RecipeImport = {
  title: 'Soup',
  description: null,
  servings: 4,
  prepTimeMin: null,
  cookTimeMin: null,
  sourceUrl: null,
  ingredients: [
    {
      sortOrder: 0,
      name: 'broth',
      quantity: 1,
      unit: 'L',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [{stepNumber: 1, body: 'Simmer'}],
};

describe('prepareImportedRecipeInput', () => {
  test('fetches tags and includes selected tag ids in recipe input', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([
        {id: 'tag-dinner', name: 'Dinner'},
        {id: 'tag-quick', name: 'Quick'},
      ]),
    );
    const client = {
      messages: {
        create: jest
          .fn<() => Promise<{content: {type: string; text: string}[]}>>()
          .mockResolvedValue({
            content: [{type: 'text', text: JSON.stringify(['Dinner'])}],
          }),
      },
    };
    const input = await prepareImportedRecipeInput({
      recipe,
      userId: 'user-uuid-1',
      queryFn: mockQuery,
      client: client as never,
    });
    expect(input.tagIds).toEqual(['tag-dinner']);
  });
});
