import request from 'supertest';

import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {
  anthropicCreateSpy,
  nockAnthropicMessage,
} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';
import {mockBillingPlan} from '../../test/mockBilling.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const SESSION_ID = 'session-uuid-1';
const PROMPT = 'make this pasta creamier and easier to follow';
const PLAN_TEXT = 'Add heavy cream and simplify the steps.';
const REFINED_REPLY = 'Use double cream and reduce to three steps.';
const FOLLOW_UP = 'Can you use double cream instead?';

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

const makeProposedRecipe = () => ({
  ...JSON.parse(IMPLEMENT_JSON),
  tagIds: [],
  imageUrl: null,
  sourceUrl: null,
});

type SessionRow = {
  id: string;
  recipe_id: string;
  user_id: string;
  phase: string;
  messages: {role: string; content: string}[];
  approved_plan: string | null;
  proposed_recipe: Record<string, unknown> | null;
  parent_version_id: string;
  change_summary: string | null;
  created_at: string;
  updated_at: string;
};

const makeSessionRow = (overrides: Partial<SessionRow> = {}): SessionRow => ({
  id: SESSION_ID,
  recipe_id: 'recipe-uuid-1',
  user_id: 'user-uuid-1',
  phase: 'planning',
  messages: [
    {role: 'user', content: PROMPT},
    {role: 'assistant', content: PLAN_TEXT},
  ],
  approved_plan: null,
  proposed_recipe: null,
  parent_version_id: 'version-uuid-1',
  change_summary: null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const mockLoadContext = () => {
  mockQuery
    .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
    .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
    .mockResolvedValueOnce(makeQueryResult([]));
};

const setupSessionFlowMocks = () => {
  let sessionState = makeSessionRow();

  mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
    if (sql.includes('from recipes r')) {
      return Promise.resolve(makeQueryResult([makeRecipeDetailRow()]));
    }
    if (sql.includes('cook_log_count')) {
      return Promise.resolve(makeQueryResult([makeVersionDetailRow()]));
    }
    if (sql.includes('from cook_logs cl')) {
      return Promise.resolve(makeQueryResult([]));
    }
    if (sql.includes('from tags')) {
      return Promise.resolve(makeQueryResult([]));
    }
    if (sql.includes('insert into ai_tweak_sessions')) {
      sessionState = makeSessionRow();
      return Promise.resolve(makeQueryResult([sessionState]));
    }
    if (sql.includes('from ai_tweak_sessions')) {
      return Promise.resolve(makeQueryResult([sessionState]));
    }
    if (sql.includes('update ai_tweak_sessions')) {
      const phase = params?.[3];
      const messagesJson = params?.[4];
      const approvedPlan = params?.[5];
      const proposedRecipeJson = params?.[6];
      const changeSummary = params?.[7];
      sessionState = {
        ...sessionState,
        phase: typeof phase === 'string' ? phase : sessionState.phase,
        messages: messagesJson
          ? (JSON.parse(messagesJson as string) as SessionRow['messages'])
          : sessionState.messages,
        approved_plan:
          approvedPlan === undefined
            ? sessionState.approved_plan
            : (approvedPlan as string | null),
        proposed_recipe: proposedRecipeJson
          ? (JSON.parse(proposedRecipeJson as string) as Record<
              string,
              unknown
            >)
          : sessionState.proposed_recipe,
        change_summary:
          changeSummary === undefined
            ? sessionState.change_summary
            : (changeSummary as string | null),
      };
      return Promise.resolve(makeQueryResult([sessionState]));
    }
    if (sql.includes('max(version_number)')) {
      return Promise.resolve(makeQueryResult([{max: 1}]));
    }
    if (sql.includes('insert into recipe_versions')) {
      return Promise.resolve(makeQueryResult([{id: 'version-uuid-2'}]));
    }
    if (sql.includes('update recipes set active_version_id')) {
      return Promise.resolve(makeQueryResult([]));
    }
    if (sql.includes('update recipes set status')) {
      return Promise.resolve(makeQueryResult([{id: 'recipe-uuid-1'}]));
    }
    return Promise.resolve(makeQueryResult([]));
  }) as typeof mockQuery);

  return {
    getSession: () => sessionState,
    setSession: (next: SessionRow) => {
      sessionState = next;
    },
  };
};

describe('POST /recipes/:id/tweak-ai-sessions', () => {
  test('returns 201 with new session and plan', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(PLAN_TEXT);
    mockBillingPlan(mockQuery, 'plus');
    mockLoadContext();
    mockQuery.mockResolvedValueOnce(makeQueryResult([{calls: 1}]));
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([makeSessionRow({messages: []})]),
    );

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/tweak-ai-sessions')
      .set('Authorization', 'Bearer valid-token')
      .send({prompt: PROMPT});

    expect(res.status).toBe(201);
    expect(res.body.plan).toBe(PLAN_TEXT);
    expect(res.body.session.phase).toBe('planning');
  });

  test('returns 400 when prompt is too short', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/tweak-ai-sessions')
      .set('Authorization', 'Bearer valid-token')
      .send({prompt: 'short'});
    expect(res.status).toBe(400);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/tweak-ai-sessions')
      .send({prompt: PROMPT});
    expect(res.status).toBe(401);
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/recipes/missing-id/tweak-ai-sessions')
      .set('Authorization', 'Bearer valid-token')
      .send({prompt: PROMPT});

    expect(res.status).toBe(404);
  });

  test('returns 409 when recipe is perfected', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([makeRecipeDetailRow({status: 'perfected'})]),
    );

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/tweak-ai-sessions')
      .set('Authorization', 'Bearer valid-token')
      .send({prompt: PROMPT});

    expect(res.status).toBe(409);
  });

  test('returns 404 when active version is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/tweak-ai-sessions')
      .set('Authorization', 'Bearer valid-token')
      .send({prompt: PROMPT});

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Active version not found');
  });

  test('returns 502 when AI planning fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockLoadContext();
    mockQuery.mockResolvedValueOnce(makeQueryResult([{calls: 1}]));
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    anthropicCreateSpy.mockRejectedValueOnce(new Error('AI down'));

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/tweak-ai-sessions')
      .set('Authorization', 'Bearer valid-token')
      .send({prompt: PROMPT});

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('AI planning failed');
  });

  test('returns 502 when Claude returns non-text content', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockLoadContext();
    mockQuery.mockResolvedValueOnce(makeQueryResult([{calls: 1}]));
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
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

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/tweak-ai-sessions')
      .set('Authorization', 'Bearer valid-token')
      .send({prompt: PROMPT});

    expect(res.status).toBe(502);
  });
});

describe('GET /recipes/:id/tweak-ai-sessions/:sessionId', () => {
  test('returns 200 with session', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([makeSessionRow()]));

    const res = await request(getApp())
      .get(`/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.session.id).toBe(SESSION_ID);
  });

  test('returns 404 when session is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .get('/api/recipes/recipe-uuid-1/tweak-ai-sessions/missing')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });
});

describe('POST /recipes/:id/tweak-ai-sessions/:sessionId/messages', () => {
  test('returns 400 when content is empty', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/messages`,
      )
      .set('Authorization', 'Bearer valid-token')
      .send({content: '   '});
    expect(res.status).toBe(400);
  });

  test('returns 404 when recipe context cannot be loaded', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeSessionRow()]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/messages`,
      )
      .set('Authorization', 'Bearer valid-token')
      .send({content: FOLLOW_UP});

    expect(res.status).toBe(404);
  });

  test('returns 200 with assistant reply', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    nockAnthropicMessage(REFINED_REPLY);
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeSessionRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([{calls: 1}]))
      .mockResolvedValueOnce(makeQueryResult([makeSessionRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeSessionRow()]));

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/messages`,
      )
      .set('Authorization', 'Bearer valid-token')
      .send({content: FOLLOW_UP});

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe(REFINED_REPLY);
  });

  test('returns 404 when session is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/messages`,
      )
      .set('Authorization', 'Bearer valid-token')
      .send({content: FOLLOW_UP});

    expect(res.status).toBe(404);
  });

  test('returns 409 when session is not in planning phase', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([makeSessionRow({phase: 'plan_approved'})]),
    );

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/messages`,
      )
      .set('Authorization', 'Bearer valid-token')
      .send({content: FOLLOW_UP});

    expect(res.status).toBe(409);
  });

  test('returns 502 when AI planning fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeSessionRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([{calls: 1}]))
      .mockResolvedValueOnce(makeQueryResult([]));
    anthropicCreateSpy.mockRejectedValueOnce(new Error('AI down'));

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/messages`,
      )
      .set('Authorization', 'Bearer valid-token')
      .send({content: FOLLOW_UP});

    expect(res.status).toBe(502);
  });
});

describe('POST /recipes/:id/tweak-ai-sessions/:sessionId/approve-plan', () => {
  test('returns 200 with preview_ready session and preview recipe', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(IMPLEMENT_JSON);
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeSessionRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeSessionRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([
          makeSessionRow({
            phase: 'preview_ready',
            approved_plan: PLAN_TEXT,
            proposed_recipe: JSON.parse(IMPLEMENT_JSON),
          }),
        ]),
      );

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/approve-plan`,
      )
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.session.phase).toBe('preview_ready');
    expect(res.body.preview.title).toBe('Improved Pasta');
    expect(res.body.changeSummary).toContain('AI tweak');
  });

  test('returns 404 when session is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/approve-plan`,
      )
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 409 when plan is already approved', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([makeSessionRow({phase: 'plan_approved'})]),
    );

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/approve-plan`,
      )
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(409);
  });

  test('returns 422 when there is no assistant plan', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([
        makeSessionRow({messages: [{role: 'user', content: PROMPT}]}),
      ]),
    );

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/approve-plan`,
      )
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('No plan to approve');
  });

  test('returns 502 when implementation fails during approve', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeSessionRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeSessionRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]));
    anthropicCreateSpy.mockRejectedValueOnce(new Error('AI down'));

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/approve-plan`,
      )
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('AI implementation failed');
  });
});

describe('POST /recipes/:id/tweak-ai-sessions/:sessionId/implement', () => {
  const approvedSession = () =>
    makeSessionRow({phase: 'plan_approved', approved_plan: PLAN_TEXT});

  test('returns 200 with preview recipe', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(IMPLEMENT_JSON);
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([approvedSession()]))
      .mockResolvedValueOnce(makeQueryResult([approvedSession()]))
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([
          makeSessionRow({
            phase: 'preview_ready',
            approved_plan: PLAN_TEXT,
            proposed_recipe: JSON.parse(IMPLEMENT_JSON),
          }),
        ]),
      );

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/implement`,
      )
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.preview.title).toBe('Improved Pasta');
    expect(res.body.session.phase).toBe('preview_ready');
  });

  test('returns 404 when session is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/implement`,
      )
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 409 when plan is not approved', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([makeSessionRow()]));

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/implement`,
      )
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(409);
  });

  test('returns 422 when approved plan is missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([
        makeSessionRow({phase: 'plan_approved', approved_plan: null}),
      ]),
    );

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/implement`,
      )
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(422);
  });

  test('returns 502 when AI JSON is invalid', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage('not valid recipe json');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([approvedSession()]))
      .mockResolvedValueOnce(makeQueryResult([approvedSession()]))
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/implement`,
      )
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(502);
  });

  test('returns 502 when AI implementation fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([approvedSession()]))
      .mockResolvedValueOnce(makeQueryResult([approvedSession()]))
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]));
    anthropicCreateSpy.mockRejectedValueOnce(new Error('AI down'));

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/implement`,
      )
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(502);
  });

  test('returns 404 when recipe context cannot be loaded', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([approvedSession()]))
      .mockResolvedValueOnce(makeQueryResult([approvedSession()]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/implement`,
      )
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });
});

describe('POST /recipes/:id/tweak-ai-sessions/:sessionId/create-version', () => {
  const previewSession = () =>
    makeSessionRow({
      phase: 'preview_ready',
      approved_plan: PLAN_TEXT,
      proposed_recipe: makeProposedRecipe(),
    });

  test('returns 201 with created version', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([previewSession()]))
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([{max: 1}]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'version-uuid-2'}]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([
          makeVersionDetailRow({
            id: 'version-uuid-2',
            version_id: 'version-uuid-2',
            version_number: 2,
            title: 'Improved Pasta',
          }),
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([previewSession()]))
      .mockResolvedValueOnce(
        makeQueryResult([makeSessionRow({phase: 'completed'})]),
      );

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/create-version`,
      )
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(201);
    expect(res.body.versionId).toBe('version-uuid-2');
    expect(res.body.session.phase).toBe('completed');
  });

  test('uses default change summary when approved plan is missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          makeSessionRow({
            phase: 'preview_ready',
            approved_plan: null,
            proposed_recipe: makeProposedRecipe(),
          }),
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([{max: 1}]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'version-uuid-2'}]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([
          makeVersionDetailRow({
            id: 'version-uuid-2',
            version_id: 'version-uuid-2',
            version_number: 2,
          }),
        ]),
      )
      .mockResolvedValueOnce(
        makeQueryResult([
          makeSessionRow({
            phase: 'preview_ready',
            approved_plan: null,
            proposed_recipe: makeProposedRecipe(),
          }),
        ]),
      )
      .mockResolvedValueOnce(
        makeQueryResult([makeSessionRow({phase: 'completed'})]),
      );

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/create-version`,
      )
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(201);
  });

  test('promotes idea lineage to evolving', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([previewSession()]))
      .mockResolvedValueOnce(
        makeQueryResult([makeRecipeDetailRow({status: 'idea'})]),
      )
      .mockResolvedValueOnce(makeQueryResult([{max: 1}]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'version-uuid-2'}]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'recipe-uuid-1'}]))
      .mockResolvedValueOnce(
        makeQueryResult([
          makeVersionDetailRow({
            id: 'version-uuid-2',
            version_id: 'version-uuid-2',
            version_number: 2,
          }),
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([previewSession()]))
      .mockResolvedValueOnce(
        makeQueryResult([makeSessionRow({phase: 'completed'})]),
      );

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/create-version`,
      )
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(201);
  });

  test('returns 404 when session is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/create-version`,
      )
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 409 when preview is not ready', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([makeSessionRow()]));

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/create-version`,
      )
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(409);
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([previewSession()]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/create-version`,
      )
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 500 when created version cannot be fetched', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([previewSession()]))
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([{max: 1}]))
      .mockResolvedValueOnce(makeQueryResult([{id: 'version-uuid-2'}]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValue(mockQueryResultEmpty());

    const res = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/create-version`,
      )
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(500);
  });

  test('returns 500 when version insert returns no id', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([previewSession()]))
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([{max: 1}]))
      .mockResolvedValueOnce(makeQueryResult([]));

    await expect(
      request(getApp())
        .post(
          `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/create-version`,
        )
        .set('Authorization', 'Bearer valid-token'),
    ).resolves.toMatchObject({status: 500});
  });
});

const mockQueryResultEmpty = () => makeQueryResult([]);

describe('POST /recipes/:id/tweak-ai-sessions/:sessionId/cancel', () => {
  test('returns 200 with cancelled session', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeSessionRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeSessionRow()]))
      .mockResolvedValueOnce(
        makeQueryResult([makeSessionRow({phase: 'cancelled'})]),
      );

    const res = await request(getApp())
      .post(`/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/cancel`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.session.phase).toBe('cancelled');
  });

  test('preserves existing proposed recipe when cancelling preview', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const preview = previewSessionRow();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([preview]))
      .mockResolvedValueOnce(makeQueryResult([preview]))
      .mockResolvedValueOnce(
        makeQueryResult([{...preview, phase: 'cancelled'}]),
      );

    const res = await request(getApp())
      .post(`/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/cancel`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.session.proposedRecipe).toBeTruthy();
  });

  test('returns 404 when session is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .post(`/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/cancel`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 409 when session is already completed', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([makeSessionRow({phase: 'completed'})]),
    );

    const res = await request(getApp())
      .post(`/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/cancel`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(409);
  });

  test('returns 409 when session is already cancelled', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([makeSessionRow({phase: 'cancelled'})]),
    );

    const res = await request(getApp())
      .post(`/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/cancel`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(409);
  });
});

const previewSessionRow = () =>
  makeSessionRow({
    phase: 'preview_ready',
    approved_plan: PLAN_TEXT,
    proposed_recipe: makeProposedRecipe(),
  });

describe('tweak AI session full conversational flow', () => {
  test('creates session, refines plan, approves with preview, and saves version', async () => {
    setupSessionFlowMocks();
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(PLAN_TEXT);
    nockAnthropicMessage(REFINED_REPLY);
    nockAnthropicMessage(IMPLEMENT_JSON);

    const createRes = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/tweak-ai-sessions')
      .set('Authorization', 'Bearer valid-token')
      .send({prompt: PROMPT});
    expect(createRes.status).toBe(201);

    nockSupabaseGetUser('user-uuid-1');
    const getRes = await request(getApp())
      .get(`/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}`)
      .set('Authorization', 'Bearer valid-token');
    expect(getRes.status).toBe(200);

    nockSupabaseGetUser('user-uuid-1');
    const messageRes = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/messages`,
      )
      .set('Authorization', 'Bearer valid-token')
      .send({content: FOLLOW_UP});
    expect(messageRes.status).toBe(200);

    nockSupabaseGetUser('user-uuid-1');
    const approveRes = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/approve-plan`,
      )
      .set('Authorization', 'Bearer valid-token');
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.session.phase).toBe('preview_ready');
    expect(approveRes.body.preview.title).toBe('Improved Pasta');

    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('from ai_tweak_sessions')) {
        return Promise.resolve(
          makeQueryResult([
            makeSessionRow({
              phase: 'preview_ready',
              approved_plan: PLAN_TEXT,
              proposed_recipe: makeProposedRecipe(),
            }),
          ]),
        );
      }
      if (sql.includes('from recipes r')) {
        return Promise.resolve(makeQueryResult([makeRecipeDetailRow()]));
      }
      if (sql.includes('cook_log_count')) {
        return Promise.resolve(
          makeQueryResult([
            makeVersionDetailRow({
              id: 'version-uuid-2',
              version_id: 'version-uuid-2',
              version_number: 2,
              title: 'Improved Pasta',
            }),
          ]),
        );
      }
      if (sql.includes('max(version_number)')) {
        return Promise.resolve(makeQueryResult([{max: 1}]));
      }
      if (sql.includes('insert into recipe_versions')) {
        return Promise.resolve(makeQueryResult([{id: 'version-uuid-2'}]));
      }
      if (sql.includes('update ai_tweak_sessions')) {
        return Promise.resolve(
          makeQueryResult([makeSessionRow({phase: 'completed'})]),
        );
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    nockSupabaseGetUser('user-uuid-1');
    const saveRes = await request(getApp())
      .post(
        `/api/recipes/recipe-uuid-1/tweak-ai-sessions/${SESSION_ID}/create-version`,
      )
      .set('Authorization', 'Bearer valid-token');
    expect(saveRes.status).toBe(201);
    expect(saveRes.body.versionId).toBe('version-uuid-2');
  });
});

