import {query as defaultQuery} from '../../db/query.js';
import {serverLog} from '../../lib/posthogLogs.js';

import type {PaddleEvent} from './paddleEvents.js';
import {shouldApplyEvent} from './paddleEventOrdering.js';

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
  }
  const email = event.data.customer?.email;
  if (email) {
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
  }
  return null;
};

/**
 * Inserts or updates the subscription row from a subscription.created /
 * .activated / .updated event. Out-of-order events are ignored (see
 * paddleEventOrdering). Unknown price ids throw so Paddle retries once the
 * plan_prices seed exists; the handler is idempotent.
 */
export const upsertSubscription = async (
  event: PaddleEvent,
  userId: string,
  queryFn: QueryFn,
): Promise<void> => {
  const priceId = event.data.items?.[0]?.price?.id;
  if (!priceId) {
    serverLog('error', 'Paddle event missing price id', {
      eventType: event.event_type,
      eventId: event.event_id,
    });
    return;
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
    throw new Error(`Unknown Paddle price id: ${priceId}`);
  }
  const mappedStatus = mapPaddleStatus(event.data.status);
  if (!mappedStatus) {
    serverLog('warn', 'Paddle event has unmapped subscription status', {
      eventType: event.event_type,
      eventId: event.event_id,
      status: event.data.status ?? 'unknown',
    });
    return;
  }

  const existing = await queryFn<{
    status: string;
    past_due_since: string | null;
    paddle_last_event_at: string | null;
  }>(
    `select status, past_due_since, paddle_last_event_at
       from subscriptions where user_id = $1`,
    [userId],
  );
  const {apply, eventAt} = shouldApplyEvent(
    event,
    existing.rows[0]?.paddle_last_event_at ?? null,
  );
  if (!apply) {
    return;
  }
  const wasPastDue = existing.rows[0]?.status === 'past_due';
  const pastDueSince =
    mappedStatus === 'past_due'
      ? wasPastDue
        ? (existing.rows[0]?.past_due_since ?? null)
        : new Date().toISOString()
      : null;

  await queryFn(
    `insert into subscriptions (
       user_id, plan, status, paddle_customer_id, paddle_subscription_id,
       paddle_price_id, current_period_start, current_period_end,
       cancel_at_period_end, past_due_since, paddle_last_event_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
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
    ],
  );
};

export const resolveSubscriptionUserId = resolveUserId;
