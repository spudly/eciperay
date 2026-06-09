import express from 'express';
import request from 'supertest';

import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';
import {nockSupabaseGetUser} from '../test/mockNockSupabase.js';

import {requireAuth, type AuthedRequest} from './requireAuth.js';

const mockQuery = createMockQuery();

const makeApp = () => {
  const app = express();
  app.locals['query'] = mockQuery;
  app.get('/me', requireAuth, (req, res) => {
    const authed = req as AuthedRequest;
    res.json({userId: authed.userId, supabaseUid: authed.supabaseUid});
  });
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
});
