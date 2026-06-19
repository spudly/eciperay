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

const SESSION_ID = 'session-uuid-1';
const PLAN_TEXT = 'Add heavy cream and simplify the steps.';

const IMPLEMENT_JSON = JSON.stringify({
  title: 'Improved Pasta',
  description: 'A creamy pasta dish.',
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
  instructions: [{stepNumber: 1, body: 'Cook pasta with cream'}],
});

const approvedSession = () => ({
  id: SESSION_ID,
  recipe_id: 'recipe-uuid-1',
  user_id: 'user-uuid-1',
  phase: 'plan_approved',
  messages: [
    {role: 'user', content: 'make this pasta creamier and easier to follow'},
    {role: 'assistant', content: PLAN_TEXT},
  ],
  approved_plan: PLAN_TEXT,
  proposed_recipe: null,
  parent_version_id: 'version-uuid-1',
  change_summary: null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
});

describe('POST /recipes/:id/tweak-ai-sessions/:sessionId/implement import errors', () => {
  test('returns 422 when prepareImportedRecipeInput fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(IMPLEMENT_JSON);
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([approvedSession()]))
      .mockResolvedValueOnce(makeQueryResult([approvedSession()]))
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(app)
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/implement`,
      )
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('servings is required');
  });
});
