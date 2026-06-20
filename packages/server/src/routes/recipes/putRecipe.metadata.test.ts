import {jest} from '@jest/globals';
import request from 'supertest';

import {makeRecipeDetail, makeRecipeInput} from '../../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

jest.unstable_mockModule('../../lib/saveRecipeMetadata.js', () => ({
  saveRecipeMetadata: async () => makeRecipeDetail({title: 'Metadata Updated'}),
}));

const {createApp} = await import('../../server.js');

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('PUT /recipes/:id metadata save', () => {
  test('returns 200 for metadata-only update on content-locked version', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]));

    const res = await request(app)
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput({title: 'Metadata Updated'}));

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Metadata Updated');
  });
});
