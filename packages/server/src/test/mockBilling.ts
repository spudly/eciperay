import {makeQueryResult} from './fixtures/queryResult.js';
import type {createMockQuery} from './mockQuery.js';

type MockQuery = ReturnType<typeof createMockQuery>;

type BillingPlan = 'plus' | 'power';

/** A subscriptions row granting the given plan. */
export const makeSubscriptionRow = (plan: BillingPlan = 'plus') => ({
  plan,
  status: 'active',
  paddle_customer_id: 'ctm_test',
  current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
  cancel_at_period_end: false,
  past_due_since: null,
});

/**
 * Prepends billing entitlement query responses to a mockResolvedValueOnce
 * chain. Call FIRST in a test's mock setup, before the test's own sequenced
 * responses — mockResolvedValueOnce is FIFO, so these are consumed first.
 *
 * `plan` null = free user (no subscription row).
 */
export const mockBillingPlan = (
  mockQuery: MockQuery,
  plan: BillingPlan | null = 'plus',
) => {
  mockQuery
    .mockResolvedValueOnce(
      makeQueryResult(plan ? [makeSubscriptionRow(plan)] : []),
    )
    .mockResolvedValueOnce(makeQueryResult([{calls: 0}]));
};

/**
 * Like mockBillingPlan, plus one response for consumeAiCall's INSERT, for
 * endpoints that meter AI calls. On AI failure paths, add one more
 * mockResolvedValueOnce for refundAiCall's UPDATE.
 */
export const mockBillingMetered = (
  mockQuery: MockQuery,
  plan: BillingPlan | null = 'plus',
) => {
  mockBillingPlan(mockQuery, plan);
  mockQuery.mockResolvedValueOnce(makeQueryResult([{calls: 1}]));
};
