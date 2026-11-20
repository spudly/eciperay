import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

describe('/account/family-sharing (#617)', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('requires auth', async () => {
    const res = await request(getApp()).get('/api/account/family-sharing');
    expect(res.status).toBe(401);
  });

  test('GET lists the owner designations', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          owner_user_id: 'user-uuid-1',
          recipient_user_id: 'viewer-uuid',
          recipient_email: 'viewer@example.com',
          recipient_display_name: 'Viewer',
          created_at: '2026-11-20T00:00:00.000Z',
        },
      ]),
    );
    const res = await request(getApp())
      .get('/api/account/family-sharing')
      .set('Authorization', 'Bearer <redacted>');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        ownerUserId: 'user-uuid-1',
        recipientUserId: 'viewer-uuid',
        recipientEmail: 'viewer@example.com',
        recipientDisplayName: 'Viewer',
        createdAt: '2026-11-20T00:00:00.000Z',
      },
    ]);
  });

  test('POST designates an existing account by email', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {id: 'viewer-uuid', email: 'viewer@example.com', display_name: 'Viewer'},
        ]),
      )
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            owner_user_id: 'user-uuid-1',
            recipient_user_id: 'viewer-uuid',
            created_at: '2026-11-20T00:00:00.000Z',
          },
        ]),
      );
    const res = await request(getApp())
      .post('/api/account/family-sharing')
      .set('Authorization', 'Bearer <redacted>')
      .send({email: 'viewer@example.com'});
    expect(res.status).toBe(201);
    expect(res.body.recipientUserId).toBe('viewer-uuid');
    expect(res.body.recipientEmail).toBe('viewer@example.com');
  });

  test('POST with an unknown email returns a clear error', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .post('/api/account/family-sharing')
      .set('Authorization', 'Bearer <redacted>')
      .send({email: 'nobody@example.com'});
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no account found/i);
  });

  test('POST with an invalid email fails validation', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .post('/api/account/family-sharing')
      .set('Authorization', 'Bearer <redacted>')
      .send({email: 'not-an-email'});
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('DELETE revokes a designation', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 1});
    const res = await request(getApp())
      .delete('/api/account/family-sharing/viewer-uuid')
      .set('Authorization', 'Bearer <redacted>');
    expect(res.status).toBe(204);
  });

  test('DELETE of a missing designation returns 404', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue({...makeQueryResult([]), rowCount: 0});
    const res = await request(getApp())
      .delete('/api/account/family-sharing/viewer-uuid')
      .set('Authorization', 'Bearer <redacted>');
    expect(res.status).toBe(404);
  });
});
