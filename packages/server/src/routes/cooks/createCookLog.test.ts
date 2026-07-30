import request from 'supertest';

import {makeCookLogRow} from '../../test/fixtures/cookLogRow.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

describe('POST /recipes/:id/versions/:versionId/cooks', () => {
  test('returns 201 with cook log', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeCookLogRow()]));

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-1/cooks')
      .set('Authorization', 'Bearer valid-token')
      .send({authorStarRating: 5, notes: 'Delicious'});

    expect(res.status).toBe(201);
    expect(res.body.authorStarRating).toBe(4);
    expect(res.body.notes).toBe('Turned out great');
  });

  test('creates cook log with omitted optional fields', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(
        makeQueryResult([
          {...makeCookLogRow(), author_star_rating: null, notes: null},
        ]),
      );

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-1/cooks')
      .set('Authorization', 'Bearer valid-token')
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.authorStarRating).toBeNull();
    expect(res.body.notes).toBeNull();
  });

  test('returns 404 when version is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/missing-version/cooks')
      .set('Authorization', 'Bearer valid-token')
      .send({notes: 'Good'});

    expect(res.status).toBe(404);
  });

  test('returns 400 when body is invalid', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-1/cooks')
      .set('Authorization', 'Bearer valid-token')
      .send({authorStarRating: 9});
    expect(res.status).toBe(400);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-1/cooks')
      .send({notes: 'Good'});
    expect(res.status).toBe(401);
  });

  test('returns 500 when insert fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/recipes/recipe-uuid-1/versions/version-uuid-1/cooks')
      .set('Authorization', 'Bearer valid-token')
      .send({notes: 'Good'});

    expect(res.status).toBe(500);
  });
});
