import request from 'supertest';

import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {makeSubscriptionRow, mockBillingPlan} from '../../test/mockBilling.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

describe('GET /api/account/entitlement', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('returns the resolved entitlement for a paying user', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');

    const res = await request(getApp())
      .get('/api/account/entitlement')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      plan: 'plus',
      status: 'active',
      aiUsed: 0,
      aiLimit: 100,
      paddleCustomerId: 'ctm_test',
      cancelAtPeriodEnd: false,
    });
  });

  test('exposes a scheduled cancellation while the plan stays active', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([
          {...makeSubscriptionRow('plus'), cancel_at_period_end: true},
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([{calls: 0}]));

    const res = await request(getApp())
      .get('/api/account/entitlement')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      plan: 'plus',
      status: 'active',
      cancelAtPeriodEnd: true,
    });
    expect(res.body.periodEndsAt).not.toBeNull();
  });

  test('returns free entitlement without a subscription', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, null);

    const res = await request(getApp())
      .get('/api/account/entitlement')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      plan: 'free',
      aiUsed: 0,
      aiLimit: 5,
      paddleCustomerId: null,
    });
  });

  test('returns 401 without auth', async () => {
    const res = await request(getApp()).get('/api/account/entitlement');
    expect(res.status).toBe(401);
  });
});
