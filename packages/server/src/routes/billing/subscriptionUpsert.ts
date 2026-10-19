import {query as defaultQuery} from '../../db/query.js';
import {serverLog} from '../../lib/posthogLogs.js';

import type {PaddleEvent} from './paddleEvents.js';
import {fetchPaddleCustomerEmail} from './paddleApi.js';
import {
  normalizeTimestamp,
  parseEventTime,
  shouldApplyEvent,
} from './paddleEventOrdering.js';

type QueryFn = typeof defaultQuery;

const mapPaddleStatus = (
  status: string | undefined,
): 'active' | 'past_due' | 'cancelled' | null => {
  switch (status) {
    case 'active':
    case 'trialing': {
      return 'active';
    }
    case 'past_due': {
      return 'past_due';
    }
    case 'canceled':
    case 'deleted': {
      return 'cancelled';
    }
    default: {
      return null;
    }
  }
};

const lookupUserByEmail = async (
  email: string,
  event: PaddleEvent,
  queryFn: QueryFn,
): Promise<string | null> => {
  const byEmail = await queryFn<{id: string}>(
    'select id from users where email = $1',
    [email],
  );
  if (byEmail.rows[0]) {
    serverLog('warn', 'Paddle webhook matched user by email fallback', {
      eventType: event.event_type,
      eventId: event.event_id,
    });
    return byEmail.rows[0].id;
  }
  return null;
};

const resolveUserId = async (
  event: PaddleEvent,
  queryFn: QueryFn,
): Promise<string | null> => {
  const customUserId = event.data.custom_data?.user_id;
  if (typeof customUserId === 'string' && customUserId.length > 0) {
    return customUserId;
  }
  if (event.data.customer_id) {
    const byCustomer = await queryFn<{user_id: string}>(
      'select user_id from subscriptions where paddle_customer_id = $1',
      [event.data.customer_id],
    );
    if (byCustomer.rows[0]) {
      return byCustomer.rows[0].user_id;
    }
    // Subscription payloads carry no customer object, so the email
    // fallback below is dead for first-ever events unless we ask Paddle
    // who this customer is. That lookup is what recovers purchases whose
    // checkout never stamped custom_data.user_id.
    const paddleEmail = await fetchPaddleCustomerEmail(event.data.customer_id);
    if (paddleEmail) {
      const byPaddleEmail = await lookupUserByEmail(
        paddleEmail,
        event,
        queryFn,
      );
      if (byPaddleEmail) {
        return byPaddleEmail;
      }
    }
  }
  const email = event.data.customer?.email;
  if (email) {
    return lookupUserByEmail(email, event, queryFn);
  }
  return null;
};

/**
 * What an upsert attempt did, so reconcile callers can tell "stored" from "this
 * candidate was unusable" from "newer state is already stored":
 *
 * - Applied: the row was written.
 * - Invalid: the candidate cannot be stored at all (missing price id, unmapped
 *   status) — trying the next candidate may still succeed.
 * - Stale: the ordering guard rejected it because newer state is stored.
 */
export type UpsertOutcome = 'applied' | 'invalid' | 'stale';

/**
 * Thrown when an event references a price id with no plan_prices row. A
 * distinct class so reconciliation callers can tell this recognized "candidate
 * is unusable" failure apart from persistence errors: the webhook path lets it
 * propagate (500, Paddle retries once the seed exists), while entitlement
 * refresh skips just that candidate.
 */
export class UnknownPaddlePriceError extends Error {
  constructor(priceId: string) {
    super(`Unknown Paddle price id: ${priceId}`);
    this.name = 'UnknownPaddlePriceError';
  }
}

/**
 * Inserts or updates the subscription row from a subscription.created /
 * .activated / .updated event. Out-of-order events are ignored (see
 * paddleEventOrdering). Unknown price ids throw so Paddle retries once the
 * plan_prices seed exists; the handler is idempotent.
 */
export type UpsertOptions = {
  /**
   * The event is a live snapshot of Paddle's current state (entitlement
   * refresh), not a webhook delivery. For snapshots, the same-vs-
   * replacement-subscription decision is made here, against the row as it
   * stands at write time: a candidate whose subscription id differs from the
   * stored row's is a replacement and applies without the revision-ordering
   * guard (its updated_at belongs to a different subscription's clock), while a
   * candidate for the stored subscription goes through the guard as usual.
   */
  snapshot?: boolean;
};

export const upsertSubscription = async (
  event: PaddleEvent,
  userId: string,
  queryFn: QueryFn,
  options: UpsertOptions = {},
): Promise<UpsertOutcome> => {
  const priceId = event.data.items?.[0]?.price?.id;
  if (!priceId) {
    serverLog('error', 'Paddle event missing price id', {
      eventType: event.event_type,
      eventId: event.event_id,
    });
    return 'invalid';
  }
  const priceRow = await queryFn<{plan: 'plus' | 'power'}>(
    'select plan from plan_prices where paddle_price_id = $1',
    [priceId],
  );
  const plan = priceRow.rows[0]?.plan;
  if (!plan) {
    // Throw (not just log) so Paddle retries: the plan_prices seed may not
    // have run yet, and silently dropping the purchase would lose it forever
    // once the event is recorded as processed. paddleWebhook maps this to a
    // 500 for retry; the handler is idempotent.
    serverLog('error', 'Paddle event references unknown price id', {
      eventType: event.event_type,
      eventId: event.event_id,
      priceId,
    });
    throw new UnknownPaddlePriceError(priceId);
  }
  const mappedStatus = mapPaddleStatus(event.data.status);
  if (!mappedStatus) {
    serverLog('warn', 'Paddle event has unmapped subscription status', {
      eventType: event.event_type,
      eventId: event.event_id,
      status: event.data.status ?? 'unknown',
    });
    return 'invalid';
  }

  const existing = await queryFn<{
    status: string;
    past_due_since: string | null;
    paddle_subscription_id: string | null;
    paddle_last_event_at: string | Date | null;
    superseded_subscription_id: string | null;
    superseded_last_event_at: string | Date | null;
  }>(
    `select status, past_due_since, paddle_subscription_id,
            paddle_last_event_at, superseded_subscription_id,
            superseded_last_event_at
       from subscriptions where user_id = $1`,
    [userId],
  );
  const existingRow = existing.rows[0];
  const storedId = existingRow?.paddle_subscription_id ?? null;
  const eventSubId = event.data.id ?? null;
  const supersededId = existingRow?.superseded_subscription_id ?? null;
  // Two identity notions: strictlyDifferent (ids differ, counting a
  // missing id as different) drives the snapshot replacement decision
  // and the grace-clock scoping, both of which err toward treating an
  // unidentifiable candidate as new; positivelyDifferent (both ids
  // known and different) is required before recording a swap, since
  // a swap asserts the outgoing subscription's identity.
  const strictlyDifferent =
    existingRow !== undefined && storedId !== eventSubId;
  const positivelyDifferent =
    storedId !== null && eventSubId !== null && storedId !== eventSubId;
  const isSupersededSubscription =
    existingRow !== undefined &&
    eventSubId !== null &&
    eventSubId === supersededId &&
    positivelyDifferent;
  // Ordering uses TWO clocks: paddle_last_event_at belongs to the
  // current subscription only, and superseded_last_event_at to the
  // subscription it replaced. Comparing an event against the other
  // subscription's clock both lets delayed old-subscription events
  // overwrite a replacement and lets the old subscription's later
  // events suppress the replacement's genuine earlier ones.
  //
  // What the superseded slot holds after this write: when this
  // event's subscription takes over the row (a swap), it records the
  // outgoing subscription and its clock; otherwise it is unchanged.
  let nextSupersededId = supersededId;
  let nextSupersededAt = normalizeTimestamp(
    existingRow?.superseded_last_event_at,
  );
  const recordSwap = () => {
    nextSupersededId = storedId;
    nextSupersededAt = normalizeTimestamp(existingRow?.paddle_last_event_at);
  };
  let eventAt: string | null;
  if (existingRow === undefined) {
    eventAt = parseEventTime(event);
  } else if (isSupersededSubscription) {
    // An event for the superseded subscription orders against its
    // own clock; only a genuinely newer revision makes it current
    // again.
    const decision = shouldApplyEvent(
      event,
      existingRow.superseded_last_event_at,
    );
    if (!decision.apply) {
      return 'stale';
    }
    eventAt = decision.eventAt;
    recordSwap();
  } else if (strictlyDifferent && options.snapshot === true) {
    // Snapshot replacement, decided against this write-time row (a
    // concurrent webhook may have replaced the row since the caller
    // read it): applies without the revision guard, stamped with
    // its OWN timestamp — never the outgoing subscription's clock.
    eventAt = parseEventTime(event);
    recordSwap();
  } else {
    const decision = shouldApplyEvent(event, existingRow.paddle_last_event_at);
    if (!decision.apply) {
      return 'stale';
    }
    eventAt = decision.eventAt;
    if (positivelyDifferent) {
      recordSwap();
    }
  }
  const wasPastDue = existing.rows[0]?.status === 'past_due';
  // The stored grace clock belongs to the stored subscription: only
  // preserve it when this update is for that same subscription. A
  // REPLACEMENT that is itself past_due must not inherit the
  // superseded subscription's clock (in either direction); it seeds
  // from its own period start like any recovered past_due snapshot.
  const preservePastDueSince =
    wasPastDue && !(options.snapshot === true && strictlyDifferent);
  // Snapshot reconciliation must not restart the past-due grace clock:
  // for a recovered past_due subscription, delinquency began with the
  // unpaid period, so seed past_due_since from the period start Paddle
  // reports instead of the refresh time. Webhook deliveries keep the
  // event-time behavior (their period start is not a delinquency
  // signal for a live transition).
  const pastDueSince =
    mappedStatus === 'past_due'
      ? preservePastDueSince
        ? (existing.rows[0]?.past_due_since ?? null)
        : options.snapshot === true
          ? (event.data.current_billing_period?.starts_at ??
            new Date().toISOString())
          : new Date().toISOString()
      : null;

  await queryFn(
    `insert into subscriptions (
       user_id, plan, status, paddle_customer_id, paddle_subscription_id,
       paddle_price_id, current_period_start, current_period_end,
       cancel_at_period_end, past_due_since, paddle_last_event_at,
       superseded_subscription_id, superseded_last_event_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     on conflict (user_id) do update set
       plan = excluded.plan,
       status = excluded.status,
       paddle_customer_id = excluded.paddle_customer_id,
       paddle_subscription_id = excluded.paddle_subscription_id,
       paddle_price_id = excluded.paddle_price_id,
       current_period_start = excluded.current_period_start,
       current_period_end = excluded.current_period_end,
       cancel_at_period_end = excluded.cancel_at_period_end,
       past_due_since = excluded.past_due_since,
       superseded_subscription_id = excluded.superseded_subscription_id,
       superseded_last_event_at = excluded.superseded_last_event_at,
       paddle_last_event_at = coalesce(
         excluded.paddle_last_event_at,
         subscriptions.paddle_last_event_at
       )`,
    [
      userId,
      plan,
      mappedStatus,
      event.data.customer_id ?? null,
      event.data.id ?? null,
      priceId,
      event.data.current_billing_period?.starts_at ?? null,
      event.data.current_billing_period?.ends_at ?? null,
      event.data.scheduled_change?.action === 'cancel',
      pastDueSince,
      eventAt,
      nextSupersededId,
      nextSupersededAt,
    ],
  );
  return 'applied';
};

export const resolveSubscriptionUserId = resolveUserId;
