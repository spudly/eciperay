import {jest} from '@jest/globals';
import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {mockBillingPlan} from '../../test/mockBilling.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const {RecipeImportError} = await import('../../lib/recipeImportToInput.js');

jest.unstable_mockModule('../../lib/saveRecipeFromInput.js', () => ({
  saveNewRecipeFromInput: async () => {
    throw new RecipeImportError('invalid recipe');
  },
  saveRecipeFromInput: async () => {
    throw new Error('not used');
  },
  RecipeNotFoundError: class RecipeNotFoundError extends Error {},
}));

const SESSION_ID = 'session-uuid-1';
const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const sessionRow = {
  id: SESSION_ID,
  user_id: 'user-uuid-1',
  phase: 'preview_ready',
  messages: [],
  approved_plan: 'Plan',
  proposed_recipe: {
    title: 'Cookies',
    servings: 12,
    ingredients: [],
    instructions: [],
  },
  change_summary: 'AI recipe',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

describe('POST /recipes/import/ai/sessions/:sessionId/create-recipe errors', () => {
  test('returns 422 when save fails validation', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([sessionRow]));
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/create-recipe`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('invalid recipe');
  });
});
