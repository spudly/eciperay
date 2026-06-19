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
  versionEditBlockedError: () => 'This version can no longer be edited',
}));

jest.unstable_mockModule('../../lib/saveRecipeFromInput.js', () => ({
  saveRecipeFromInput: async () => {
    throw new RecipeNotFoundError();
  },
  saveNewRecipeFromInput: async () => {
    throw new Error('not used in this test');
  },
  RecipeNotFoundError,
}));

const {createApp} = await import('../../server.js');

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('PUT /recipes/:id save not found', () => {
  test('returns 404 when saveRecipeFromInput throws RecipeNotFoundError', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]));

    const res = await request(app)
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Recipe not found');
  });
});
