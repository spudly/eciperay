import express from 'express';
import request from 'supertest';
import type {QueryResult} from 'pg';

import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';
import {nockSupabaseGetUser} from '../test/mockNockSupabase.js';

import {requireAdmin} from './requireAdmin.js';
import {requireAuth} from './requireAuth.js';

const mockQuery = createMockQuery();

/**
 * Wraps mockQuery.mockImplementation for SQL-routing mocks (same approach as
 * entitlement.test.ts).
 */
const mockRouteQueries = (impl: (text: string) => Promise<QueryResult>) => {
  mockQuery.mockImplementation(impl);
};

const mockAdminLookup = (isAdmin: boolean | null) => {
  mockRouteQueries((text: string) => {
    if (text.includes('is_admin')) {
      return Promise.resolve(
        makeQueryResult(isAdmin === null ? [] : [{is_admin: isAdmin}]),
      );
    }
    return Promise.resolve(makeQueryResult([]));
  });
};

const makeApp = () => {
  const app = express();
  app.locals['query'] = mockQuery;
  // Mirrors server.ts: no user upsert in tests, so userId = supabase uid.
  app.locals['skipUserUpsert'] = true;
  app.get('/admin-only', requireAuth, requireAdmin(mockQuery), (_req, res) => {
    res.json({ok: true});
  });
  app.get('/admin-without-auth', requireAdmin(mockQuery), (_req, res) => {
    res.json({ok: true});
  });
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(500).json({error: (err as Error).message});
    },
  );
  return app;
};

const authed = (app: express.Express, path: string) =>
  request(app).get(path).set('Authorization', 'Bearer <redacted>');

describe('requireAdmin', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    nockSupabaseGetUser('supabase-uid-1');
  });

  test('passes an admin user through', async () => {
    mockAdminLookup(true);
    const res = await authed(makeApp(), '/admin-only');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ok: true});
  });

  test('403s a non-admin user', async () => {
    mockAdminLookup(false);
    const res = await authed(makeApp(), '/admin-only');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({error: 'Admin access required'});
  });

  test('403s when the user has no users row', async () => {
    mockAdminLookup(null);
    const res = await authed(makeApp(), '/admin-only');
    expect(res.status).toBe(403);
  });

  test('errors when requireAuth did not run first', async () => {
    mockAdminLookup(true);
    const res = await request(makeApp()).get('/admin-without-auth');
    expect(res.status).toBe(500);
    expect(res.body.error).toContain('requireAuth must run before');
  });

  test('passes a database failure to the error handler', async () => {
    mockQuery.mockRejectedValue(new Error('database unavailable'));
    const res = await authed(makeApp(), '/admin-only');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('database unavailable');
  });
});
