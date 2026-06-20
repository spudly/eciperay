import {jest} from '@jest/globals';
import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {
  anthropicCreateSpy,
  nockAnthropicMessage,
} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

jest.unstable_mockModule('../../lib/prepareImportedRecipeInput.js', () => ({
  prepareImportedRecipeInput: async () => {
    throw new Error('prepare failed');
  },
}));

const {createApp} = await import('../../server.js');

const SESSION_ID = 'session-uuid-1';
const PROMPT = 'simple chocolate chip cookies for 12';
const PLAN_TEXT = 'Plan for chocolate chip cookies.';

const makeSessionRow = () => ({
  id: SESSION_ID,
  user_id: 'user-uuid-1',
  phase: 'planning',
  messages: [
    {role: 'user', content: PROMPT},
    {role: 'assistant', content: PLAN_TEXT},
  ],
  approved_plan: null,
  proposed_recipe: null,
  change_summary: null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
});

const IMPLEMENT_JSON = JSON.stringify({
  title: 'Chocolate Chip Cookies',
  description: 'Classic cookies.',
  servings: 12,
  prepTimeMin: 15,
  cookTimeMin: 12,
  ingredients: [
    {
      sortOrder: 0,
      name: 'flour',
      quantity: 2,
      unit: 'cups',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [{stepNumber: 1, body: 'Bake cookies'}],
});

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('create AI session implement prepare rethrow', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    anthropicCreateSpy.mockReset();
  });

  test('returns 500 when prepareImportedRecipeInput throws unexpectedly', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(IMPLEMENT_JSON);
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('from ai_create_sessions')) {
        return Promise.resolve(makeQueryResult([makeSessionRow()]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);
    const res = await request(app)
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/approve-plan`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(500);
  });
});
