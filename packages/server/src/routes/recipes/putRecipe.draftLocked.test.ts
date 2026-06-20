import {jest} from '@jest/globals';
import request from 'supertest';

import {makeRecipeInput} from '../../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

jest.unstable_mockModule('../../lib/isVersionEditable.js', () => ({
  isVersionEditable: () => false,
  isVersionContentLocked: () => false,
  versionEditBlockedError: () => 'This version can no longer be edited',
  versionContentLockedError: () =>
    'Ingredients and instructions are locked on this version',
}));

const {createApp} = await import('../../server.js');

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('PUT /recipes/:id non-editable draft guard', () => {
  test('returns 409 when version is not editable and not content-locked', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]));

    const res = await request(app)
      .put('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());

    expect(res.status).toBe(409);
    expect(res.body.error).toBe(
      'Ingredients and instructions are locked on this version',
    );
  });
});
