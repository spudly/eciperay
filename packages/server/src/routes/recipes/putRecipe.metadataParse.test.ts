import {jest} from '@jest/globals';
import request from 'supertest';

import {RecipeMetadataInputSchema} from '../../lib/schemas.js';
import {makeRecipeInput} from '../../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {createApp} from '../../server.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('PUT /recipes/:id metadata parse guard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns 400 when metadata schema rejects input', async () => {
    jest
      .spyOn(RecipeMetadataInputSchema, 'safeParse')
      .mockReturnValue({
        success: false,
        error: {message: 'bad metadata'},
      } as never);
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]));

    const res = await request(app)
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('bad metadata');
  });
});
