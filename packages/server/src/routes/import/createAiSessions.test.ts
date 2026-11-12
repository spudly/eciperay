import {jest} from '@jest/globals';
import request from 'supertest';

import {RecipeImportError} from '../../lib/recipeImportToInput.js';
import {makeRecipeDetail} from '../../test/fixtures/recipe.js';

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

// #460 tranche 1: the former qualifier-segment files for this route
// (createAiSessions.anthropic / .prepare / .prepareRethrow /
// .recipe / .recipeErrors / .recipeNotFound / .recipeRethrow) are
// merged below. Two of them mocked prepareImportedRecipeInput and
// four mocked saveRecipeFromInput, each with a different scenario,
// so the merges sit behind per-describe mutable mock factories:
// each factory delegates to a jest.fn whose implementation a
// describe installs in beforeEach; the default implementation
// (installed by the root beforeEach) is the real module, loaded
// before the mocks were registered.
const actualPrepareModule =
  await import('../../lib/prepareImportedRecipeInput.js');
const actualSaveRecipeModule = await import('../../lib/saveRecipeFromInput.js');

const {RecipeNotFoundError} = actualSaveRecipeModule;

const mockPrepareImportedRecipeInput =
  jest.fn<typeof actualPrepareModule.prepareImportedRecipeInput>();
const mockSaveRecipeFromInput =
  jest.fn<typeof actualSaveRecipeModule.saveRecipeFromInput>();
const mockSaveNewRecipeFromInput =
  jest.fn<typeof actualSaveRecipeModule.saveNewRecipeFromInput>();

jest.unstable_mockModule('../../lib/prepareImportedRecipeInput.js', () => ({
  prepareImportedRecipeInput: (
    ...args: Parameters<typeof actualPrepareModule.prepareImportedRecipeInput>
  ) => mockPrepareImportedRecipeInput(...args),
}));

jest.unstable_mockModule('../../lib/saveRecipeFromInput.js', () => ({
  saveRecipeFromInput: (
    ...args: Parameters<typeof actualSaveRecipeModule.saveRecipeFromInput>
  ) => mockSaveRecipeFromInput(...args),
  saveNewRecipeFromInput: (
    ...args: Parameters<typeof actualSaveRecipeModule.saveNewRecipeFromInput>
  ) => mockSaveNewRecipeFromInput(...args),
  RecipeNotFoundError,
}));

// Default: every mocked module behaves as the real implementation.
// Qualifier describes override only the factories they exercise.
beforeEach(() => {
  mockPrepareImportedRecipeInput.mockImplementation(
    actualPrepareModule.prepareImportedRecipeInput,
  );
  mockSaveRecipeFromInput.mockImplementation(
    actualSaveRecipeModule.saveRecipeFromInput,
  );
  mockSaveNewRecipeFromInput.mockImplementation(
    actualSaveRecipeModule.saveNewRecipeFromInput,
  );
});

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

// The preview-ready session row shared by the former
// createAiSessions.recipe* files.
const previewSessionRow = {
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
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(makeQueryResult([makeSubscriptionRow('plus')]));
      }
      if (sql.includes('from ai_usage')) {
        return Promise.resolve(
          makeQueryResult([
            {calls: 0, period_start: '2026-10-01', allowed: true},
          ]),
        );
      }
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
    mockBillingPlan(mockQuery, 'plus');
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
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([makeSessionRow()]));
    const res = await request(getApp())
      .get(`/api/recipes/import/ai/sessions/${SESSION_ID}`)
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body.session.id).toBe(SESSION_ID);
  });

  test('returns 404 when session not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
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
          makeQueryResult([
            {
              calls: sql.trimStart().startsWith('insert') ? 1 : 0,
              period_start: '2026-10-01',
              allowed: true,
            },
          ]),
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
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(makeQueryResult([makeSubscriptionRow('plus')]));
      }
      if (sql.includes('from ai_usage')) {
        return Promise.resolve(
          makeQueryResult([
            {calls: 0, period_start: '2026-10-01', allowed: true},
          ]),
        );
      }
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
    mockBillingPlan(mockQuery, 'plus');
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
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/approve-plan`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(404);
  });

  test('returns 409 when approving session not in planning', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
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
    mockBillingPlan(mockQuery, 'plus');
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
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([{calls: 1, period_start: '2026-10-01', allowed: true}]),
    );
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/messages`)
      .set('Authorization', 'Bearer valid-token')
      .send({content: FOLLOW_UP});
    expect(res.status).toBe(502);
  });

  test('returns 404 when create-recipe session is missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/create-recipe`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(404);
  });

  test('returns 502 when implementation JSON is invalid', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
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
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/cancel`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(404);
  });
});

describe('AI quota 402s', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('POST /ai/sessions 402s when quota is exhausted', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([
        {calls: 999, period_start: '2026-10-01', allowed: false},
      ]),
    );

    const res = await request(getApp())
      .post('/api/recipes/import/ai/sessions')
      .set('Authorization', 'Bearer test-token')
      .send({prompt: PROMPT});

    expect(res.status).toBe(402);
    expect(res.body.error).toBe('ai_quota_exhausted');
  });

  test('POST /ai/sessions/:id/messages 402s when quota is exhausted', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeSessionRow()]))
      .mockResolvedValueOnce(
        makeQueryResult([
          {calls: 999, period_start: '2026-10-01', allowed: false},
        ]),
      );

    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/messages`)
      .set('Authorization', 'Bearer test-token')
      .send({content: FOLLOW_UP});

    expect(res.status).toBe(402);
    expect(res.body.error).toBe('ai_quota_exhausted');
  });
  test('free users are 403 on every step of the AI session workflow', async () => {
    const steps: ['get' | 'post', string][] = [
      ['get', `/api/recipes/import/ai/sessions/${SESSION_ID}`],
      ['post', `/api/recipes/import/ai/sessions/${SESSION_ID}/approve-plan`],
      ['post', `/api/recipes/import/ai/sessions/${SESSION_ID}/create-recipe`],
      ['post', `/api/recipes/import/ai/sessions/${SESSION_ID}/cancel`],
    ];
    for (const [method, path] of steps) {
      nockSupabaseGetUser('user-uuid-1');
      mockBillingPlan(mockQuery, 'free');
      const res = await request(getApp())
        [method](path)
        .set('Authorization', 'Bearer <redacted>')
        .send({});
      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'plan_required',
        requiredPlan: 'plus',
        plan: 'free',
        message:
          "This feature requires the Plus plan. You're on the Free plan.",
      });
    }
  });
});

// Former createAiSessions.anthropic.test.ts.
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
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(
          makeQueryResult([{plan: 'plus', status: 'active'}]),
        );
      }
      if (sql.includes('from ai_usage')) {
        return Promise.resolve(makeQueryResult([{calls: 0}]));
      }
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
  });
});

// Former createAiSessions.prepare.test.ts.
describe('create AI session implement prepare errors', () => {
  beforeEach(() => {
    mockPrepareImportedRecipeInput.mockImplementation(async () => {
      throw new RecipeImportError('invalid imported recipe');
    });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    anthropicCreateSpy.mockReset();
  });

  test('returns 422 when prepareImportedRecipeInput throws RecipeImportError', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(IMPLEMENT_JSON);
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(
          makeQueryResult([{plan: 'plus', status: 'active'}]),
        );
      }
      if (sql.includes('from ai_usage')) {
        return Promise.resolve(makeQueryResult([{calls: 0}]));
      }
      if (sql.includes('from ai_create_sessions')) {
        return Promise.resolve(makeQueryResult([makeSessionRow()]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/approve-plan`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('invalid imported recipe');
  });
});

// Former createAiSessions.prepareRethrow.test.ts.
describe('create AI session implement prepare rethrow', () => {
  beforeEach(() => {
    mockPrepareImportedRecipeInput.mockImplementation(async () => {
      throw new Error('prepare failed');
    });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    anthropicCreateSpy.mockReset();
  });

  test('returns 500 when prepareImportedRecipeInput throws unexpectedly', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(IMPLEMENT_JSON);
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(
          makeQueryResult([{plan: 'plus', status: 'active'}]),
        );
      }
      if (sql.includes('from ai_usage')) {
        return Promise.resolve(makeQueryResult([{calls: 0}]));
      }
      if (sql.includes('from ai_create_sessions')) {
        return Promise.resolve(makeQueryResult([makeSessionRow()]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/approve-plan`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(500);
  });
});

// Former createAiSessions.recipe.test.ts.
describe('POST /recipes/import/ai/sessions/:sessionId/create-recipe (mocked save)', () => {
  beforeEach(() => {
    mockSaveNewRecipeFromInput.mockImplementation(async () => ({
      recipeId: 'recipe-uuid-1',
      versionId: 'version-uuid-1',
      recipe: makeRecipeDetail(),
    }));
    mockSaveRecipeFromInput.mockImplementation(async () => {
      throw new Error('not used');
    });
  });

  test('creates recipe from preview', async () => {
    nockSupabaseGetUser('user-uuid-1');
    let state = previewSessionRow;
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('from subscriptions')) {
        return Promise.resolve(
          makeQueryResult([{plan: 'plus', status: 'active'}]),
        );
      }
      if (sql.includes('from ai_usage')) {
        return Promise.resolve(makeQueryResult([{calls: 0}]));
      }
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

// Former createAiSessions.recipeErrors.test.ts.
describe('POST /recipes/import/ai/sessions/:sessionId/create-recipe errors', () => {
  beforeEach(() => {
    mockSaveNewRecipeFromInput.mockImplementation(async () => {
      throw new RecipeImportError('invalid recipe');
    });
    mockSaveRecipeFromInput.mockImplementation(async () => {
      throw new Error('not used');
    });
  });

  test('returns 422 when save fails validation', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([previewSessionRow]));
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/create-recipe`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('invalid recipe');
  });
});

// Former createAiSessions.recipeNotFound.test.ts.
describe('POST /recipes/import/ai/sessions/:sessionId/create-recipe not found', () => {
  beforeEach(() => {
    mockSaveNewRecipeFromInput.mockImplementation(async () => {
      throw new RecipeNotFoundError();
    });
    mockSaveRecipeFromInput.mockImplementation(async () => {
      throw new Error('not used');
    });
  });

  test('returns 404 when save cannot find recipe', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([previewSessionRow]));
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/create-recipe`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Recipe not found');
  });
});

// Former createAiSessions.recipeRethrow.test.ts.
describe('POST /recipes/import/ai/sessions/:sessionId/create-recipe rethrow', () => {
  beforeEach(() => {
    mockSaveNewRecipeFromInput.mockImplementation(async () => {
      throw new Error('save boom');
    });
    mockSaveRecipeFromInput.mockImplementation(async () => {
      throw new Error('not used');
    });
  });

  test('propagates unexpected save errors', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValueOnce(makeQueryResult([previewSessionRow]));
    const res = await request(getApp())
      .post(`/api/recipes/import/ai/sessions/${SESSION_ID}/create-recipe`)
      .set('Authorization', 'Bearer valid-token')
      .send();
    expect(res.status).toBe(500);
  });
});
