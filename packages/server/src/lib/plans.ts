import type {Entitlement, PlanLimits, PlanName, SubscriptionStatus} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

type QueryFn = typeof defaultQuery;

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  free: {recipes: 50, aiCallsPerMonth: 5, mealPlans: false, apiAccess: false},
  plus: {recipes: -1, aiCallsPerMonth: 100, mealPlans: true, apiAccess: false},
  power: {recipes: -1, aiCallsPerMonth: 500, mealPlans: true, apiAccess: true},
};

const PLAN_RANK: Record<PlanName, number> = {free: 0, plus: 1, power: 2};

export const planAtOrAbove = (plan: PlanName, minimum: PlanName): boolean =>
  PLAN_RANK[plan] >= PLAN_RANK[minimum];

/**
 * Grace period for past_due subscriptions before the lazy downgrade kicks in.
 * Paddle retries + emails the customer during this window. No manual outreach.
 */
export const PAST_DUE_GRACE_DAYS = 7;

type SubscriptionRow = {
  plan: 'plus' | 'power';
  status: SubscriptionStatus;
  paddle_customer_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  past_due_since: string | null;
};

/**
 * Resolves a user's entitlement. Downgrades are evaluated lazily on each
 * request — no cron jobs:
 * - cancelled: free once now() passes current_period_end (or immediately if
 *   no period end is recorded)
 * - past_due: free once past_due_since + PAST_DUE_GRACE_DAYS passes
 * - expired: free
 * Data is never deleted or locked by a downgrade.
 */
export const resolveEntitlement = async (
  userId: string,
  queryFn: QueryFn = defaultQuery,
): Promise<Entitlement> => {
  const subResult = await queryFn<SubscriptionRow>(
    `select plan, status, paddle_customer_id, current_period_end,
            cancel_at_period_end, past_due_since
       from subscriptions
      where user_id = $1`,
    [userId],
  );
  const row = subResult.rows[0];

  let plan: PlanName = 'free';
  let status: SubscriptionStatus | null = null;
  let periodEndsAt: string | null = null;
  let paddleCustomerId: string | null = null;

  if (row && (row.plan === 'plus' || row.plan === 'power')) {
    status = row.status;
    paddleCustomerId = row.paddle_customer_id;
    periodEndsAt = row.current_period_end;

    const now = Date.now();
    const periodEndMs = row.current_period_end
      ? Date.parse(row.current_period_end)
      : Number.NaN;
    const cancelledExpired =
      row.status === 'cancelled' &&
      (Number.isNaN(periodEndMs) || now > periodEndMs);
    const pastDueSinceMs = row.past_due_since
      ? Date.parse(row.past_due_since)
      : Number.NaN;
    const pastDueExpired =
      row.status === 'past_due' &&
      !Number.isNaN(pastDueSinceMs) &&
      now > pastDueSinceMs + PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000;
    const hardExpired = row.status === 'expired';

    if (!cancelledExpired && !pastDueExpired && !hardExpired) {
      plan = row.plan;
    }
  }

  const usageResult = await queryFn<{calls: number}>(
    `select calls from ai_usage
      where user_id = $1 and period_start = date_trunc('month', now())::date`,
    [userId],
  );
  const aiUsed = usageResult.rows[0]?.calls ?? 0;

  return {
    plan,
    status,
    aiUsed,
    aiLimit: PLAN_LIMITS[plan].aiCallsPerMonth,
    periodEndsAt,
    paddleCustomerId,
  };
};
