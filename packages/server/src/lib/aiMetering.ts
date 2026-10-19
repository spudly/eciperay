import type {PlanName} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';
import {withTransaction} from '../db/withTransaction.js';

import {PLAN_LIMITS} from './plans.js';

type QueryFn = typeof defaultQuery;

export type QuotaCheck =
  {ok: true; periodStart?: string} | {ok: false; used: number; limit: number};

/**
 * Atomically consumes one AI call from the user's monthly quota. Single
 * statement (insert-or-increment) so concurrent requests can't race past the
 * limit. The increment is conditional: once the stored count reaches the plan
 * limit, further calls are rejected WITHOUT incrementing, so reported usage
 * stays accurate.
 *
 * Call BEFORE the AI call; call refundAiCall with the returned periodStart if
 * the AI call throws — failed provider calls must not burn quota (support
 * tickets otherwise).
 */
export type ConsumeAiCallOptions = {
  /**
   * Entitlement-override grants (migration 018) are never blocked. Usage is
   * still recorded (and refundable) so aiUsed stays truthful.
   */
  unlimited?: boolean;
};

export const consumeAiCall = async (
  userId: string,
  plan: PlanName,
  queryFn: QueryFn = defaultQuery,
  options: ConsumeAiCallOptions = {},
): Promise<QuotaCheck> => {
  if (options.unlimited) {
    const recorded = await queryFn<{calls: number; period_start: string}>(
      `insert into ai_usage (user_id, period_start, calls)
       values ($1, date_trunc('month', now())::date, 1)
       on conflict (user_id, period_start) do update
         set calls = ai_usage.calls + 1
       returning calls, period_start`,
      [userId],
    );
    // The INSERT...RETURNING always yields exactly one row.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- INSERT guarantees a row
    const row = recorded.rows[0]!;
    return {ok: true, periodStart: row.period_start};
  }
  const limit = PLAN_LIMITS[plan].aiCallsPerMonth;
  const result = await queryFn<{
    calls: number;
    period_start: string;
    allowed: boolean;
  }>(
    // Single statement so concurrent requests can't race past the limit. The
    // locked CTE reads the pre-increment count (blocking on concurrent
    // writers); the upsert only increments while under the limit, so
    // rejected checks don't inflate reported usage.
    `with locked as (
       select calls as old_calls
         from ai_usage
        where user_id = $1 and period_start = date_trunc('month', now())::date
        for update
     ),
     upserted as (
       insert into ai_usage (user_id, period_start, calls)
       values ($1, date_trunc('month', now())::date, 1)
       on conflict (user_id, period_start) do update
         set calls = case
           when ai_usage.calls < $2 then ai_usage.calls + 1
           else ai_usage.calls
         end
       returning calls, period_start
     )
     select upserted.calls,
            upserted.period_start,
            coalesce(locked.old_calls, 0) < $2 as allowed
       from upserted
       left join locked on true`,
    [userId, limit],
  );
  // The CTE's INSERT...RETURNING always yields exactly one row.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- CTE guarantees a row
  const row = result.rows[0]!;
  const used = row.calls;
  const periodStart = row.period_start;
  if (row.allowed) {
    return {ok: true, periodStart};
  }
  return {ok: false, used, limit};
};

/**
 * Refunds one AI call (e.g. the provider call failed). Never drops below 0.
 * Pass the periodStart returned by consumeAiCall so a request straddling a
 * month boundary refunds the month that was actually charged.
 */
export const refundAiCall = async (
  userId: string,
  queryFn: QueryFn = defaultQuery,
  periodStart?: string,
): Promise<void> => {
  if (periodStart) {
    await queryFn(
      `update ai_usage
          set calls = greatest(calls - 1, 0)
        where user_id = $1 and period_start = $2::date`,
      [userId, periodStart],
    );
    return;
  }
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
  // count(*) always returns exactly one row.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- count(*) guarantees a row
  const used = Number.parseInt(result.rows[0]!.count, 10);
  return used < limit ? {ok: true} : {ok: false, used, limit};
};

/** Standard 402 response body for exhausted metered limits. */
export const quotaExhaustedBody = (
  error: 'ai_quota_exhausted' | 'recipe_limit',
  used: number,
  limit: number,
) => ({error, used, limit});

export type CappedResult<T> =
  {ok: true; value: T} | {ok: false; used: number; limit: number};

/**
 * Runs a recipe-creation callback under the Free recipe cap. The cap check and
 * the creation run in one transaction holding a per-user advisory lock, so two
 * concurrent requests can't both pass the check and exceed the limit.
 * Plus/Power skip the check (and the lock) entirely.
 */
export const withRecipeCap = async <T>(
  userId: string,
  plan: PlanName,
  queryFn: QueryFn,
  create: (q: QueryFn) => Promise<T>,
): Promise<CappedResult<T>> => {
  const limit = PLAN_LIMITS[plan].recipes;
  if (limit < 0) {
    return {ok: true, value: await create(queryFn)};
  }
  // A mocked queryFn (tests) has no real transaction support: run the check
  // and creation directly, mirroring runTransactional. In production, hold a
  // per-user advisory lock across the check+create so concurrent requests
  // can't race past the limit.
  /* c8 ignore next 10 -- production-only: requires a real DB transaction */
  if (queryFn === defaultQuery) {
    return withTransaction(async q => {
      await q('select pg_advisory_xact_lock(hashtext($1))', [userId]);
      const cap = await checkRecipeCap(userId, plan, q);
      if (!cap.ok) {
        return cap;
      }
      return {ok: true, value: await create(q)};
    });
  }
  const cap = await checkRecipeCap(userId, plan, queryFn);
  if (!cap.ok) {
    return cap;
  }
  return {ok: true, value: await create(queryFn)};
};
