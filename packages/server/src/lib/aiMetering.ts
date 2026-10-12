import type {PlanName} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

import {PLAN_LIMITS} from './plans.js';

type QueryFn = typeof defaultQuery;

export type QuotaCheck = {ok: true} | {ok: false; used: number; limit: number};

/**
 * Atomically consumes one AI call from the user's monthly quota. Single
 * statement (insert-or-increment) so concurrent requests can't race past the
 * limit.
 *
 * Call BEFORE the AI call; call refundAiCall if the AI call throws — failed
 * provider calls must not burn quota (support tickets otherwise).
 */
export const consumeAiCall = async (
  userId: string,
  plan: PlanName,
  queryFn: QueryFn = defaultQuery,
): Promise<QuotaCheck> => {
  const result = await queryFn<{calls: number}>(
    `insert into ai_usage (user_id, period_start, calls)
     values ($1, date_trunc('month', now())::date, 1)
     on conflict (user_id, period_start) do update
       set calls = ai_usage.calls + 1
     returning calls`,
    [userId],
  );
  const used = result.rows[0]?.calls ?? 0;
  const limit = PLAN_LIMITS[plan].aiCallsPerMonth;
  return used <= limit ? {ok: true} : {ok: false, used, limit};
};

/** Refunds one AI call (e.g. the provider call failed). Never drops below 0. */
export const refundAiCall = async (
  userId: string,
  queryFn: QueryFn = defaultQuery,
): Promise<void> => {
  await queryFn(
    `update ai_usage
        set calls = greatest(calls - 1, 0)
      where user_id = $1 and period_start = date_trunc('month', now())::date`,
    [userId],
  );
};

/**
 * Enforces the Free recipe cap. Plus/Power (-1) always pass. Downgraded users
 * keep all existing recipes — creation 402s until they are back under the cap.
 */
export const checkRecipeCap = async (
  userId: string,
  plan: PlanName,
  queryFn: QueryFn = defaultQuery,
): Promise<QuotaCheck> => {
  const limit = PLAN_LIMITS[plan].recipes;
  if (limit < 0) {
    return {ok: true};
  }
  const result = await queryFn<{count: string}>(
    'select count(*) as count from recipes where user_id = $1',
    [userId],
  );
  const used = Number.parseInt(result.rows[0]?.count ?? '0', 10);
  return used < limit ? {ok: true} : {ok: false, used, limit};
};

/** Standard 402 response body for exhausted metered limits. */
export const quotaExhaustedBody = (
  error: 'ai_quota_exhausted' | 'recipe_limit',
  used: number,
  limit: number,
) => ({error, used, limit});
