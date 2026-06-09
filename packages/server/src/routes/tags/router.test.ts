import request from 'supertest';

import {createApp} from '../../server.js';
import {makeTag} from '../../test/fixtures/tag.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});
const AUTH = 'Bearer valid-token';

describe('GET /tags', () => {
  test('returns 200 with tag list', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([makeTag()]));
    const res = await request(app).get('/tags').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).get('/tags');
    expect(res.status).toBe(401);
  });
});

describe('POST /tags', () => {
  test('returns 201 with the created tag', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([makeTag({name: 'Lunch'})]));
    const res = await request(app)
      .post('/tags')
      .set('Authorization', AUTH)
      .send({name: 'Lunch'});
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Lunch');
  });
});

describe('DELETE /tags/:id', () => {
  test('returns 204 when tag is deleted', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([makeTag()]));
    const res = await request(app)
      .delete('/tags/tag-uuid-1')
      .set('Authorization', AUTH);
    expect(res.status).toBe(204);
  });

  test('returns 404 when tag is not found or is a preset', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 0});
    const res = await request(app)
      .delete('/tags/missing-id')
      .set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).delete('/tags/tag-uuid-1');
    expect(res.status).toBe(401);
  });
});
