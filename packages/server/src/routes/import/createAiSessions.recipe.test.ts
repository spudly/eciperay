import {jest} from '@jest/globals';
import request from 'supertest';

import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

jest.unstable_mockModule('../../lib/saveRecipeFromInput.js', () => ({
  saveNewRecipeFromInput: async () => ({
    recipeId: 'recipe-uuid-1',
    versionId: 'version-uuid-1',
    recipe: makeRecipeDetail(),
  }),
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

describe('POST /recipes/import/ai/sessions/:sessionId/create-recipe (mocked save)', () => {
  test('creates recipe from preview', async () => {
    nockSupabaseGetUser('user-uuid-1');
    let state = sessionRow;
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('from ai_create_sessions')) {
        return Promise.resolve(makeQueryResult([state]));
      }
      if (sql.includes('update ai_create_sessions')) {
        state = {...state, phase: 'completed'};
        return Promise.resolve(makeQueryResult([state]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/create-recipe`)
      .set('Authorization', 'Bearer valid-token')
      .send();

    expect(res.status).toBe(201);
    expect(res.body.recipeId).toBe('recipe-uuid-1');
    expect(res.body.session.phase).toBe('completed');
  });
});
