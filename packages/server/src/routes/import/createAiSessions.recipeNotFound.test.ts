import {jest} from '@jest/globals';
import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

class RecipeNotFoundError extends Error {
  constructor() {
    super('Recipe not found');
    this.name = 'RecipeNotFoundError';
  }
}

jest.unstable_mockModule('../../lib/saveRecipeFromInput.js', () => ({
  saveNewRecipeFromInput: async () => {
    throw new RecipeNotFoundError();
  },
  saveRecipeFromInput: async () => {
    throw new Error('not used');
  },
  RecipeNotFoundError,
}));

const {createApp} = await import('../../server.js');

const SESSION_ID = 'session-uuid-1';
const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

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

describe('POST /recipes/import/ai/sessions/:sessionId/create-recipe not found', () => {
  test('returns 404 when save cannot find recipe', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(makeQueryResult([sessionRow]));
    const res = await request(app)
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/create-recipe`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Recipe not found');
  });
});
