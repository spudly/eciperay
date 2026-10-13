import request from 'supertest';
import type {QueryResult, QueryResultRow} from 'pg';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {mockBillingPlan} from '../../test/mockBilling.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const tokenRow = {
  id: 'token-uuid-1',
  name: 'Claude Desktop',
  token_prefix: 'ecp_abcdefgh',
  created_at: '2026-10-12T00:00:00.000Z',
  last_used_at: null,
  revoked_at: null,
};

describe('account personal access token routes', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('POST /account/personal-access-tokens creates a token', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'power');
    // Echo the inserted prefix so tokenPrefix matches the generated token.
    mockQuery.mockImplementationOnce(
      async <T extends QueryResultRow>(
        _text: string,
        params?: unknown[],
      ): Promise<QueryResult<T>> =>
        makeQueryResult([
          {...tokenRow, token_prefix: params?.[3] as string},
        ]) as unknown as QueryResult<T>,
    );

    const res = await request(getApp())
      .post('/api/account/personal-access-tokens')
      .set('Authorization', 'Bearer <redacted>')
      .send({name: 'Claude Desktop'});

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Claude Desktop');
    expect(res.body.tokenPrefix).toBe(res.body.token.slice(0, 12));
    expect(res.body.token).toMatch(/^ecp_/);
    expect(res.body.createdAt).toBe('2026-10-12T00:00:00.000Z');
    expect(res.body).not.toHaveProperty('token_hash');
    expect(res.body).not.toHaveProperty('user_id');
  });

  test('POST returns 400 for a missing name', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'power');

    const res = await request(getApp())
      .post('/api/account/personal-access-tokens')
      .set('Authorization', 'Bearer <redacted>')
      .send({});

    expect(res.status).toBe(400);
  });

  test('POST returns 500 when the insert yields no row', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'power');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/account/personal-access-tokens')
      .set('Authorization', 'Bearer <redacted>')
      .send({name: 'Claude Desktop'});

    expect(res.status).toBe(500);
  });

  test('POST returns 400 for a whitespace-only name', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'power');

    const res = await request(getApp())
      .post('/api/account/personal-access-tokens')
      .set('Authorization', 'Bearer <redacted>')
      .send({name: '   '});

    expect(res.status).toBe(400);
  });

  test('GET /account/personal-access-tokens lists tokens', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'power');
    mockQuery.mockResolvedValueOnce(makeQueryResult([tokenRow]));

    const res = await request(getApp())
      .get('/api/account/personal-access-tokens')
      .set('Authorization', 'Bearer <redacted>');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 'token-uuid-1',
        name: 'Claude Desktop',
        tokenPrefix: 'ecp_abcdefgh',
        createdAt: '2026-10-12T00:00:00.000Z',
        lastUsedAt: null,
        revokedAt: null,
      },
    ]);
    expect(res.body[0]).not.toHaveProperty('token');
  });

  test('DELETE /account/personal-access-tokens/:id revokes a token', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'power');
    mockQuery.mockResolvedValueOnce(makeQueryResult([{}]));

    const res = await request(getApp())
      .delete('/api/account/personal-access-tokens/token-uuid-1')
      .set('Authorization', 'Bearer <redacted>');

    expect(res.status).toBe(204);
  });

  test('DELETE returns 404 for an unknown token', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'power');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .delete('/api/account/personal-access-tokens/token-uuid-9')
      .set('Authorization', 'Bearer <redacted>');

    expect(res.status).toBe(404);
  });

  test('DELETE returns 404 when rowCount is null', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'power');
    mockQuery.mockResolvedValueOnce({...makeQueryResult([]), rowCount: null});

    const res = await request(getApp())
      .delete('/api/account/personal-access-tokens/token-uuid-9')
      .set('Authorization', 'Bearer <redacted>');

    expect(res.status).toBe(404);
  });

  test('a personal access token authenticates requests', async () => {
    // Token lookup succeeds and resolves the owning user.
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{user_id: 'user-uuid-1'}]))
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            id: 'user-uuid-1',
            supabase_uid: 'supabase-uid-1',
            email: 'chef@example.com',
          },
        ]),
      );
    // Entitlement lookups (loadEntitlement) run after auth, before the handler.
    mockBillingPlan(mockQuery, 'power');
    // GET list query
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .get('/api/account/personal-access-tokens')
      .set('Authorization', 'Bearer ecp_testtoken');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('a revoked personal access token is rejected', async () => {
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .get('/api/account/personal-access-tokens')
      .set('Authorization', 'Bearer ecp_revokedtoken');

    expect(res.status).toBe(401);
  });

  test('a personal access token for a deleted user is rejected', async () => {
    // Token lookup succeeds but the owning user row is gone.
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{user_id: 'user-uuid-1'}]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .get('/api/account/personal-access-tokens')
      .set('Authorization', 'Bearer ecp_validtoken');

    expect(res.status).toBe(401);
  });

  test('POST returns 403 for a free-tier user', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, null);

    const res = await request(getApp())
      .post('/api/account/personal-access-tokens')
      .set('Authorization', 'Bearer test-token')
      .send({name: 'Claude Desktop'});

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('plan_required');
    expect(res.body.requiredPlan).toBe('power');
  });

  test('GET returns 403 for a Plus-tier user (API access is Power-only)', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');

    const res = await request(getApp())
      .get('/api/account/personal-access-tokens')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('plan_required');
  });
});
