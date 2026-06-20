import {jest} from '@jest/globals';
import request from 'supertest';

import {makeRecipeInput} from '../../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

class RecipeNotFoundError extends Error {
  constructor() {
    super('Recipe not found');
    this.name = 'RecipeNotFoundError';
  }
}

jest.unstable_mockModule('../../lib/isVersionEditable.js', () => ({
  isVersionEditable: () => true,
  isVersionContentLocked: () => false,
  versionEditBlockedError: () => 'This version can no longer be edited',
  versionContentLockedError: () =>
    'Ingredients and instructions are locked on this version',
}));

jest.unstable_mockModule('../../lib/saveRecipeFromInput.js', () => ({
  saveRecipeFromInput: async () => {
    throw new Error('save failed');
  },
  saveNewRecipeFromInput: async () => {
    throw new Error('not used in this test');
  },
  RecipeNotFoundError,
}));

const {createApp} = await import('../../server.js');

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('PUT /recipes/:id save rethrow', () => {
  test('propagates unexpected saveRecipeFromInput errors', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]));

    await expect(
      request(app)
        .put('/api/recipes/recipe-uuid-1')
        .set('Authorization', 'Bearer valid-token')
        .send(makeRecipeInput()),
    ).resolves.toMatchObject({status: 500});
  });
});
