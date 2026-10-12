import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {
  anthropicCreateSpy,
  nockAnthropicMessage,
} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';
import {
  mockBillingMetered,
  mockBillingPlan,
  makeSubscriptionRow,
} from '../../test/mockBilling.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const SESSION_ID = 'session-uuid-1';
const PROMPT = 'simple chocolate chip cookies for 12';
const PLAN_TEXT = 'Plan for chocolate chip cookies.';
const FOLLOW_UP = 'Can you use brown butter?';
const REFINED_REPLY = 'Use brown butter in the dough.';

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

type SessionRow = {
  id: string;
  user_id: string;
  phase: string;
  messages: {role: string; content: string}[];
  approved_plan: string | null;
  proposed_recipe: Record<string, unknown> | null;
  change_summary: string | null;
  created_at: string;
  updated_at: string;
};

const makeSessionRow = (overrides: Partial<SessionRow> = {}): SessionRow => ({
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
  ...overrides,
});

describe('POST /recipes/import/ai/sessions', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    anthropicCreateSpy.mockReset();
  });

  test('starts a planning session', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(PLAN_TEXT);
    mockBillingMetered(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([makeSessionRow()]));
    const res = await request(getApp())
      .post('/api/recipes/import/ai/sessions')
      .set('Authorization', 'Bearer valid-token')
      .send({prompt: PROMPT});
    expect(res.status).toBe(201);
    expect(res.body.session.phase).toBe('planning');
    expect(res.body.plan).toBe(PLAN_TEXT);
  });

  test('returns 400 when prompt is too short', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    const res = await request(getApp())
      .post('/api/recipes/import/ai/sessions')
      .set('Authorization', 'Bearer valid-token')
      .send({prompt: 'pasta'});
    expect(res.status).toBe(400);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp())
      .post('/api/recipes/import/ai/sessions')
      .send({prompt: PROMPT});
    expect(res.status).toBe(401);
  });
});

describe('POST /recipes/import/ai/sessions/:sessionId/approve-plan', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    anthropicCreateSpy.mockReset();
  });

  test('approves plan and returns preview', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(IMPLEMENT_JSON);
    let sessionState = makeSessionRow();
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('from ai_create_sessions')) {
        return Promise.resolve(makeQueryResult([sessionState]));
      }
      if (sql.includes('update ai_create_sessions')) {
        sessionState = {
          ...sessionState,
          phase: 'preview_ready',
          proposed_recipe: JSON.parse(IMPLEMENT_JSON),
        };
        return Promise.resolve(makeQueryResult([sessionState]));
      }
      if (sql.includes('from tags')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/approve-plan`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(200);
    expect(res.body.session.phase).toBe('preview_ready');
    expect(res.body.preview.title).toBe('Chocolate Chip Cookies');
  });
});

describe('POST /recipes/import/ai/sessions/:sessionId/create-recipe', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('returns 409 when preview is not ready', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([
        makeSessionRow({phase: 'planning', proposed_recipe: null}),
      ]),
    );
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/create-recipe`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('No preview ready to save');
  });
});

describe('GET /recipes/import/ai/sessions/:sessionId', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('returns session when found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(makeQueryResult([makeSessionRow()]));
    const res = await request(getApp())
      .get(`/api/recipes/import/ai/sessions/${SESSION_ID}`)
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body.session.id).toBe(SESSION_ID);
  });

  test('returns 404 when session not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(getApp())
      .get('/api/recipes/import/ai/sessions/missing')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
  });
});

describe('POST /recipes/import/ai/sessions/:sessionId/messages', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    anthropicCreateSpy.mockReset();
  });

  test('refines plan in planning phase', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(REFINED_REPLY);
    let sessionState = makeSessionRow();
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(makeQueryResult([makeSubscriptionRow('plus')]));
      }
      if (sql.includes('ai_usage')) {
        return Promise.resolve(
          makeQueryResult([{calls: sql.trimStart().startsWith('insert') ? 1 : 0}]),
        );
      }
      if (sql.includes('from ai_create_sessions')) {
        return Promise.resolve(makeQueryResult([sessionState]));
      }
      if (sql.includes('update ai_create_sessions')) {
        sessionState = {
          ...sessionState,
          messages: [
            ...sessionState.messages,
            {role: 'user', content: FOLLOW_UP},
            {role: 'assistant', content: REFINED_REPLY},
          ],
        };
        return Promise.resolve(makeQueryResult([sessionState]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/messages`)
      .set('Authorization', 'Bearer valid-token')
      .send({content: FOLLOW_UP});
    expect(res.status).toBe(200);
    expect(res.body.reply).toBe(REFINED_REPLY);
  });

  test('returns 409 when plan already approved', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingMetered(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([makeSessionRow({phase: 'preview_ready'})]),
    );
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/messages`)
      .set('Authorization', 'Bearer valid-token')
      .send({content: FOLLOW_UP});
    expect(res.status).toBe(409);
  });
});

describe('POST /recipes/import/ai/sessions/:sessionId/cancel', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('cancels an active session', async () => {
    nockSupabaseGetUser('user-uuid-1');
    let sessionState = makeSessionRow();
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('from ai_create_sessions')) {
        return Promise.resolve(makeQueryResult([sessionState]));
      }
      if (sql.includes('update ai_create_sessions')) {
        sessionState = {...sessionState, phase: 'cancelled'};
        return Promise.resolve(makeQueryResult([sessionState]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/cancel`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(200);
    expect(res.body.session.phase).toBe('cancelled');
  });

  test('returns 409 when session already finished', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([makeSessionRow({phase: 'completed'})]),
    );
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/cancel`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(409);
  });
});

describe('create AI session error paths', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    anthropicCreateSpy.mockReset();
  });

  test('returns 502 when planning fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    anthropicCreateSpy.mockRejectedValueOnce(new Error('AI down'));
    mockBillingMetered(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(getApp())
      .post('/api/recipes/import/ai/sessions')
      .set('Authorization', 'Bearer valid-token')
      .send({prompt: PROMPT});
    expect(res.status).toBe(502);
  });

  test('returns 400 when message content is too short', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/messages`)
      .set('Authorization', 'Bearer valid-token')
      .send({content: ''});
    expect(res.status).toBe(400);
  });

  test('returns 404 when sending message to missing session', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/messages`)
      .set('Authorization', 'Bearer valid-token')
      .send({content: FOLLOW_UP});
    expect(res.status).toBe(404);
  });

  test('returns 404 when approving missing session', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/approve-plan`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(404);
  });

  test('returns 409 when approving session not in planning', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([makeSessionRow({phase: 'preview_ready'})]),
    );
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/approve-plan`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(409);
  });

  test('returns 422 when session has no assistant plan', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([
        makeSessionRow({messages: [{role: 'user', content: PROMPT}]}),
      ]),
    );
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/approve-plan`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(422);
  });

  test('returns 502 when refine planning fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    anthropicCreateSpy.mockRejectedValueOnce(new Error('AI down'));
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([makeSessionRow()]));
    mockQuery.mockResolvedValueOnce(makeQueryResult([{calls: 1}]));
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/messages`)
      .set('Authorization', 'Bearer valid-token')
      .send({content: FOLLOW_UP});
    expect(res.status).toBe(502);
  });

  test('returns 404 when create-recipe session is missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/create-recipe`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(404);
  });

  test('returns 502 when implementation JSON is invalid', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage('not valid json');
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('from ai_create_sessions')) {
        return Promise.resolve(makeQueryResult([makeSessionRow()]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/approve-plan`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('AI implementation failed');
  });

  test('returns 404 when cancelling missing session', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/cancel`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(404);
  });
});

