import express from 'express';
import nock from 'nock';
import request from 'supertest';

import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';
import {nockSupabaseGetUser} from '../test/mockNockSupabase.js';

import {requireAuth, type AuthedRequest} from './requireAuth.js';

const mockQuery = createMockQuery();

const makeApp = (locals: Record<string, unknown> = {}) => {
  const app = express();
  app.locals['query'] = mockQuery;
  Object.assign(app.locals, locals);
  app.get('/me', requireAuth, (req, res) => {
    const authed = req as AuthedRequest;
    res.json({userId: authed.userId, supabaseUid: authed.supabaseUid});
  });
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      void _next;
      res.status(500).json({error: (err as Error).message});
    },
  );
  return app;
};

describe('requireAuth', () => {
  test('sets userId to the internal users.id from upsert', async () => {
    nockSupabaseGetUser('4e35e006-2ea0-40f2-8ef9-af42b51f266a');
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          id: 'd4abc91e-f882-4ffd-897e-80e37ceb2590',
          supabase_uid: '4e35e006-2ea0-40f2-8ef9-af42b51f266a',
        },
      ]),
    );

    const res = await request(makeApp())
      .get('/me')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      userId: 'd4abc91e-f882-4ffd-897e-80e37ceb2590',
      supabaseUid: '4e35e006-2ea0-40f2-8ef9-af42b51f266a',
    });
  });

  test('returns 400 when the authenticated user has no email', async () => {
    const supabaseUrl =
      process.env['SUPABASE_URL'] ?? 'http://supabase-test.local';
    nock(supabaseUrl)
      .get('/auth/v1/user')
      .reply(200, {id: '4e35e006-2ea0-40f2-8ef9-af42b51f266a'});

    const res = await request(makeApp())
      .get('/me')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({error: 'Authenticated user has no email'});
  });

  test('returns 500 when user upsert returns no row', async () => {
    nockSupabaseGetUser('4e35e006-2ea0-40f2-8ef9-af42b51f266a');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(makeApp())
      .get('/me')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({error: 'Failed to resolve user record'});
  });

  test('returns 500 when user upsert throws', async () => {
    nockSupabaseGetUser('4e35e006-2ea0-40f2-8ef9-af42b51f266a');
    mockQuery.mockRejectedValue(new Error('database unavailable'));

    const res = await request(makeApp())
      .get('/me')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({error: 'database unavailable'});
  });

  test('uses supabaseUid as userId when user upsert is skipped', async () => {
    nockSupabaseGetUser('4e35e006-2ea0-40f2-8ef9-af42b51f266a');

    const res = await request(makeApp({skipUserUpsert: true}))
      .get('/me')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      userId: '4e35e006-2ea0-40f2-8ef9-af42b51f266a',
      supabaseUid: '4e35e006-2ea0-40f2-8ef9-af42b51f266a',
    });
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
