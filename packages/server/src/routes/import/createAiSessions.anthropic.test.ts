import request from 'supertest';

import {createApp} from '../../server.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {anthropicCreateSpy} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

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

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('create AI session anthropic edge cases', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    anthropicCreateSpy.mockReset();
  });

  test('returns 502 when anthropic returns non-text content on approve', async () => {
    nockSupabaseGetUser('user-uuid-1');
    anthropicCreateSpy.mockResolvedValueOnce({
      id: 'msg-test',
      type: 'message',
      role: 'assistant',
      content: [{type: 'tool_use', id: 'tool-1', name: 'x', input: {}}],
      model: 'claude-haiku-4-5',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {input_tokens: 10, output_tokens: 10},
    } as never);
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
    expect(res.status).toBe(502);
  });
});
