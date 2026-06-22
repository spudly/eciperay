import express from 'express';
import nock from 'nock';
import request from 'supertest';

import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';
import {
  nockSupabaseGetUser,
  nockSupabaseGetUserError,
} from '../test/mockNockSupabase.js';

import {optionalAuth, type OptionalAuthedRequest} from './optionalAuth.js';

const mockQuery = createMockQuery();

const makeApp = (locals: Record<string, unknown> = {}) => {
  const app = express();
  app.locals['query'] = mockQuery;
  app.locals['skipUserUpsert'] = true;
  Object.assign(app.locals, locals);
  app.get('/maybe', optionalAuth, (req, res) => {
    const authed = req as OptionalAuthedRequest;
    res.json({userId: authed.userId ?? null});
  });
  return app;
};

describe('optionalAuth', () => {
  test('continues without userId when no token is provided', async () => {
    const res = await request(makeApp()).get('/maybe');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({userId: null});
  });

  test('attaches userId when a valid token is provided', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(makeApp())
      .get('/maybe')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({userId: 'user-uuid-1'});
  });

  test('continues anonymously when the token is invalid', async () => {
    nockSupabaseGetUserError();
    const res = await request(makeApp())
      .get('/maybe')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({userId: null});
  });

  test('resolves internal user id when user upsert is enabled', async () => {
    nockSupabaseGetUser('4e35e006-2ea0-40f2-8ef9-af42b51f266a');
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          id: 'd4abc91e-f882-4ffd-897e-80e37ceb2590',
          supabase_uid: '4e35e006-2ea0-40f2-8ef9-af42b51f266a',
        },
      ]),
    );

    const app = express();
    app.locals['query'] = mockQuery;
    app.get('/maybe', optionalAuth, (req, res) => {
      const authed = req as OptionalAuthedRequest;
      res.json({userId: authed.userId ?? null});
    });

    const res = await request(app)
      .get('/maybe')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({userId: 'd4abc91e-f882-4ffd-897e-80e37ceb2590'});
  });

  test('continues anonymously when authenticated user has no email', async () => {
    const supabaseUrl =
      process.env['SUPABASE_URL'] ?? 'http://supabase-test.local';
    nock(supabaseUrl).get('/auth/v1/user').reply(200, {id: 'user-uuid-1'});

    const app = express();
    app.locals['query'] = mockQuery;
    app.get('/maybe', optionalAuth, (req, res) => {
      const authed = req as OptionalAuthedRequest;
      res.json({userId: authed.userId ?? null});
    });

    const res = await request(app)
      .get('/maybe')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({userId: null});
  });

  test('returns 500 when user upsert throws', async () => {
    nockSupabaseGetUser('4e35e006-2ea0-40f2-8ef9-af42b51f266a');
    mockQuery.mockRejectedValue(new Error('database unavailable'));

    const app = express();
    app.locals['query'] = mockQuery;
    app.get('/maybe', optionalAuth, (_req, res) => {
      res.json({ok: true});
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

    const res = await request(app)
      .get('/maybe')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({error: 'database unavailable'});
  });
});
