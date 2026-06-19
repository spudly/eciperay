import {jest} from '@jest/globals';
import request from 'supertest';

import {RecipeImportError} from '../../lib/recipeImportToInput.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockAnthropicMessage} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

jest.unstable_mockModule('../../lib/prepareImportedRecipeInput.js', () => ({
  prepareImportedRecipeInput: async () => {
    throw new RecipeImportError('servings is required');
  },
}));

const {createApp} = await import('../../server.js');

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

const CLAUDE_RESPONSE = JSON.stringify({
  title: 'Improved Pasta',
  description: 'Better pasta.',
  servings: 4,
  prepTimeMin: 10,
  cookTimeMin: 20,
  ingredients: [
    {
      sortOrder: 0,
      name: 'pasta',
      quantity: 400,
      unit: 'g',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [{stepNumber: 1, body: 'Cook pasta'}],
});

describe('POST /recipes/:id/versions/ai import errors', () => {
  test('returns 422 when prepareImportedRecipeInput fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(CLAUDE_RESPONSE);
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/versions/ai')
      .set('Authorization', 'Bearer valid-token')
      .send({prompt: 'make this pasta creamier and easier to follow'});

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('servings is required');
  });
});
