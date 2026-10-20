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
import {
  UnknownPaddlePriceError,
  upsertSubscription,
} from '../billing/subscriptionUpsert.js';

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
    // Always Paddle's own revision timestamp, never local processing
    // time: a snapshot read just before a concurrent cancellation must
    // not stamp its stale state as newest and make the ordering guard
    // reject the real cancellation. Whether the candidate is a revision
    // of the stored subscription or a replacement for it is decided in
    // upsertSubscription against the row at write time (snapshot mode)
    // — a subscription id read here could already be outdated by a
    // concurrent webhook. Falls back to now only when Paddle gave no
    // usable timestamp.
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

  const subRow = await queryFn<{
    paddle_customer_id: string | null;
    paddle_subscription_id: string | null;
  }>(
    'select paddle_customer_id, paddle_subscription_id from subscriptions where user_id = $1',
    [req.userId],
  );
  let customerId = subRow.rows[0]?.paddle_customer_id ?? null;
  // The selection stored as this refresh begins: together with the
  // fetched list's ids it defines what a snapshot write may
  // legitimately replace (see knownSelectionIds below).
  const preFetchSubscriptionId = subRow.rows[0]?.paddle_subscription_id ?? null;
  if (!customerId && req.userEmail) {
    try {
      customerId = await findPaddleCustomerIdByEmail(req.userEmail);
    } catch {
      // A failed lookup is not "no such customer": report it like a
      // failed subscriptions fetch rather than returning the stale
      // entitlement as if reconciliation had succeeded.
      res.status(502).json({error: 'failed to refresh subscription status'});
      return;
    }
  }
  if (!customerId) {
    // Paddle has no customer for this user: nothing to reconcile.
    res.json(await resolveEntitlement(req.userId, queryFn));
    return;
  }

  let subscriptions = await listPaddleSubscriptions(customerId);
  if (subscriptions === null) {
    res.status(502).json({error: 'failed to refresh subscription status'});
    return;
  }

  // Reconcile against the ranked candidates. A 'stale' outcome means
  // the stored state moved past the snapshot — which is a no-op when
  // the stored row is simply an equal/newer revision of the same
  // candidate, but NOT when the candidate itself changed state after
  // the list was fetched: if the top-ranked active subscription was
  // canceled in the meantime, stopping at 'stale' would leave the
  // canceled subscription selected and never try another still-
  // active one, stranding a paying user on Free. So a stale outcome
  // triggers ONE re-fetch and re-rank against the newer state
  // (bounded: a second stale is accepted as the no-op case). The
  // loop never blindly continues into lower-ranked candidates from
  // the stale list — the re-ranked list decides.
  for (let pass = 0; pass < 2; pass += 1) {
    const candidates = [...subscriptions].sort((a, b) => {
      const byStatus = statusPriority(a) - statusPriority(b);
      return byStatus !== 0 ? byStatus : periodEndMs(b) - periodEndMs(a);
    });
    // What this pass's writes may legitimately replace: the ids in
    // THIS list, plus the subscription stored when the refresh
    // began. A write-time selection outside that set was installed
    // by a webhook mid-refresh (e.g. a newly activated
    // subscription) and must not be overwritten from this list —
    // the upsert refuses, and the re-fetch pass re-ranks with the
    // new subscription included.
    const knownSelectionIds = new Set<string>(
      subscriptions
        .map(sub => sub['id'])
        .filter((id): id is string => typeof id === 'string'),
    );
    if (preFetchSubscriptionId !== null) {
      knownSelectionIds.add(preFetchSubscriptionId);
    }
    // The listed state behind those ids: a subscription that WAS
    // listed can still change mid-refresh (a webhook resumes a
    // listed-paused subscription, say), and the id guard alone
    // would let a lower-ranked candidate ranked against its old
    // state replace its newer one. The upsert compares the stored
    // row against this state and refuses a replacement when the
    // current subscription has advanced past its listed revision.
    const knownSelectionState = new Map<
      string,
      {status: string | null; updatedAt: string | null}
    >(
      subscriptions
        .filter(
          (sub): sub is Record<string, unknown> & {id: string} =>
            typeof sub['id'] === 'string',
        )
        .map(sub => [
          sub['id'],
          {
            status: sub['status'] as string | null,
            updatedAt: sub['updated_at'] as string | null,
          },
        ]),
    );
    // A candidate skipped ONLY because its price is unmapped still
    // represents Paddle's current granting state (it is active or
    // past_due in the live list): falling through to a lower
    // candidate can only downgrade from it — a canceled one ends
    // access outright, and a past_due one may already be out of
    // grace, resolving to Free when it seeds its grace clock.
    // Once such a candidate has been seen, only another ACTIVE
    // candidate (which certainly grants) may be tried; if none is
    // usable, the stored entitlement stands. The flag is per-pass:
    // it describes THIS list, and a re-fetched list is judged on
    // its own contents.
    let unpricedGrantingSeen = false;
    let sawStale = false;
    for (const candidate of candidates) {
      if (unpricedGrantingSeen && statusPriority(candidate) > 0) {
        continue;
      }
      try {
        const outcome = await upsertSubscription(
          toSyntheticEvent(candidate),
          req.userId,
          queryFn,
          {snapshot: true, knownSelectionIds, knownSelectionState},
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
        // 'applied': done. 'stale': the pass is done too, but the
        // refresh re-fetches once before settling (see above).
        sawStale = outcome === 'stale';
        break;
      } catch (error) {
        if (error instanceof UnknownPaddlePriceError) {
          // Recognized unusable candidate: skip it and try the next one
          // rather than failing the whole refresh — unless it grants
          // access, in which case no lower-standing candidate may
          // replace it (see unpricedGrantingSeen above).
          if (statusPriority(candidate) <= 1) {
            unpricedGrantingSeen = true;
          }
          serverLog('warn', 'Entitlement refresh skipped a subscription', {
            subscriptionId: String(candidate['id']),
            error: error.message,
          });
          continue;
        }
        // Anything else is a persistence failure, not an unusable
        // candidate. Falling through to a lower-ranked candidate here
        // could write a historical canceled subscription over the
        // preferred active one and downgrade a paying user to Free —
        // fail the refresh instead.
        serverLog('error', 'Entitlement refresh failed to persist candidate', {
          subscriptionId: String(candidate['id']),
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({error: 'failed to refresh subscription status'});
        return;
      }
    }
    if (!sawStale || pass === 1) {
      break;
    }
    const refetched = await listPaddleSubscriptions(customerId);
    if (refetched === null) {
      res.status(502).json({error: 'failed to refresh subscription status'});
      return;
    }
    subscriptions = refetched;
  }

  res.json(await resolveEntitlement(req.userId, queryFn));
};
