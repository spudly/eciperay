import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {resolveEntitlement} from '../../lib/plans.js';
import {serverLog} from '../../lib/posthogLogs.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import type {PaddleEvent} from '../billing/paddleEvents.js';
import {
  findPaddleCustomerIdByEmail,
  listPaddleSubscriptions,
} from '../billing/paddleApi.js';
import {upsertSubscription} from '../billing/subscriptionUpsert.js';

type QueryFn = typeof defaultQuery;

/**
 * POST /api/account/entitlement/refresh — reconcile the user's stored
 * subscription with Paddle directly.
 *
 * Entitlement is normally webhook-driven, but a webhook delivery can be lost
 * (e.g. an early event that could not be mapped to a user before the retry
 * fix). This endpoint is the self-heal: ask Paddle what subscriptions the user
 * actually has and upsert the best one through the same code path as the
 * webhook, then answer with the freshly resolved entitlement.
 */

const STATUS_PRIORITY: Record<string, number> = {
  active: 0,
  trialing: 0,
  past_due: 1,
  paused: 2,
  canceled: 3,
};

const statusPriority = (sub: Record<string, unknown>): number =>
  STATUS_PRIORITY[sub['status'] as string] ?? 4;

const periodEndMs = (sub: Record<string, unknown>): number => {
  const period = sub['current_billing_period'] as
    {ends_at?: unknown} | undefined;
  const endsAt = period?.ends_at;
  const parsed = typeof endsAt === 'string' ? Date.parse(endsAt) : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
};

/** Normalize a Paddle API subscription into the webhook event data shape. */
const toSyntheticEvent = (sub: Record<string, unknown>): PaddleEvent => {
  const items = Array.isArray(sub['items']) ? sub['items'] : [];
  const normalizedItems = items.map(item => {
    const entry = (item ?? {}) as Record<string, unknown>;
    const price = entry['price'] as {id?: unknown} | undefined;
    if (typeof price?.id === 'string') {
      return {price: {id: price.id}};
    }
    return {price: {id: entry['price_id'] as string}};
  });
  const period = sub['current_billing_period'] as
    {starts_at?: string; ends_at?: string} | undefined;
  const scheduledChange = sub['scheduled_change'] as
    {action?: string} | null | undefined;
  const updatedAt = sub['updated_at'];
  return {
    event_id: `refresh-${String(sub['id'])}`,
    event_type: 'subscription.updated',
    // Order by Paddle's own revision timestamp, never local processing
    // time: a snapshot read just before a concurrent cancellation must
    // not stamp its stale state as newest and make the ordering guard
    // reject the real cancellation. Falls back to now only when Paddle
    // gave no usable timestamp (in the lost-webhook case this endpoint
    // heals there is no competing stored timestamp anyway).
    occurred_at:
      typeof updatedAt === 'string' && !Number.isNaN(Date.parse(updatedAt))
        ? updatedAt
        : new Date().toISOString(),
    data: {
      id: sub['id'] as string,
      customer_id: sub['customer_id'] as string,
      status: sub['status'] as string,
      custom_data: sub['custom_data'] as {user_id?: string} | undefined,
      items: normalizedItems,
      current_billing_period: period
        ? {starts_at: period.starts_at, ends_at: period.ends_at}
        : undefined,
      scheduled_change: scheduledChange ?? null,
    },
  };
};

export const refreshEntitlement = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  if (!process.env['PADDLE_API_KEY']) {
    res.status(500).json({error: 'billing not configured'});
    return;
  }

  const subRow = await queryFn<{paddle_customer_id: string | null}>(
    'select paddle_customer_id from subscriptions where user_id = $1',
    [req.userId],
  );
  let customerId = subRow.rows[0]?.paddle_customer_id ?? null;
  if (!customerId && req.userEmail) {
    customerId = await findPaddleCustomerIdByEmail(req.userEmail);
  }
  if (!customerId) {
    // Paddle has no customer for this user: nothing to reconcile.
    res.json(await resolveEntitlement(req.userId, queryFn));
    return;
  }

  const subscriptions = await listPaddleSubscriptions(customerId);
  if (subscriptions === null) {
    res.status(502).json({error: 'failed to refresh subscription status'});
    return;
  }

  const candidates = [...subscriptions].sort((a, b) => {
    const byStatus = statusPriority(a) - statusPriority(b);
    return byStatus !== 0 ? byStatus : periodEndMs(b) - periodEndMs(a);
  });
  for (const candidate of candidates) {
    try {
      const outcome = await upsertSubscription(
        toSyntheticEvent(candidate),
        req.userId,
        queryFn,
      );
      if (outcome === 'invalid') {
        // Unusable candidate (e.g. a paused subscription, whose status
        // the upsert does not map) — a lower-ranked candidate may still
        // correct the stored entitlement, so keep going.
        serverLog('warn', 'Entitlement refresh skipped a subscription', {
          subscriptionId: String(candidate['id']),
          reason: 'invalid candidate',
        });
        continue;
      }
      // 'applied', or 'stale' (stored state is newer than this snapshot —
      // nothing a lower-ranked candidate could fix). Done either way.
      break;
    } catch (error) {
      // e.g. an unknown price id — skip this subscription and try the
      // next one rather than failing the whole refresh.
      serverLog('warn', 'Entitlement refresh skipped a subscription', {
        subscriptionId: String(candidate['id']),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  res.json(await resolveEntitlement(req.userId, queryFn));
};
