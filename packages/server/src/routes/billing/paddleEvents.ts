import {query as defaultQuery} from '../../db/query.js';
import {serverLog} from '../../lib/posthogLogs.js';

type QueryFn = typeof defaultQuery;

export type PaddleEvent = {
  event_id: string;
  event_type: string;
  occurred_at?: string;
  data: {
    id?: string;
    customer_id?: string;
    status?: string;
    custom_data?: {user_id?: string};
    items?: {price?: {id?: string}}[];
    current_billing_period?: {starts_at?: string; ends_at?: string};
    scheduled_change?: {action?: string} | null;
    customer?: {email?: string};
  };
};

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

const upsertSubscription = async (
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
    serverLog('error', 'Paddle event references unknown price id', {
      eventType: event.event_type,
      eventId: event.event_id,
      priceId,
    });
    return;
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
  }>('select status, past_due_since from subscriptions where user_id = $1', [
    userId,
  ]);
  const wasPastDue = existing.rows[0]?.status === 'past_due';
  const pastDueSince =
    mappedStatus === 'past_due'
      ? wasPastDue
        ? existing.rows[0]?.past_due_since ?? null
        : new Date().toISOString()
      : null;

  await queryFn(
    `insert into subscriptions (
       user_id, plan, status, paddle_customer_id, paddle_subscription_id,
       paddle_price_id, current_period_start, current_period_end,
       cancel_at_period_end, past_due_since
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     on conflict (user_id) do update set
       plan = excluded.plan,
       status = excluded.status,
       paddle_customer_id = excluded.paddle_customer_id,
       paddle_subscription_id = excluded.paddle_subscription_id,
       paddle_price_id = excluded.paddle_price_id,
       current_period_start = excluded.current_period_start,
       current_period_end = excluded.current_period_end,
       cancel_at_period_end = excluded.cancel_at_period_end,
       past_due_since = excluded.past_due_since`,
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
    ],
  );
};

export const handlePaddleEvent = async (
  event: PaddleEvent,
  queryFn: QueryFn,
): Promise<void> => {
  switch (event.event_type) {
    case 'subscription.created':
    case 'subscription.activated':
    case 'subscription.updated': {
      const userId = await resolveUserId(event, queryFn);
      if (!userId) {
        serverLog('error', 'Paddle event could not be mapped to a user', {
          eventType: event.event_type,
          eventId: event.event_id,
        });
        return;
      }
      await upsertSubscription(event, userId, queryFn);
      return;
    }
    case 'subscription.canceled': {
      const subscriptionId = event.data.id;
      if (subscriptionId) {
        await queryFn(
          `update subscriptions
              set status = 'cancelled', cancel_at_period_end = true
            where paddle_subscription_id = $1`,
          [subscriptionId],
        );
      }
      return;
    }
    case 'subscription.past_due': {
      const subscriptionId = event.data.id;
      if (subscriptionId) {
        await queryFn(
          `update subscriptions
              set status = 'past_due',
                  past_due_since = coalesce(past_due_since, now())
            where paddle_subscription_id = $1`,
          [subscriptionId],
        );
      }
      return;
    }
    case 'transaction.completed':
    case 'transaction.refunded': {
      // Informational only; entitlement is driven by subscription state.
      serverLog('info', 'Paddle transaction event received', {
        eventType: event.event_type,
        eventId: event.event_id,
      });
      return;
    }
    default: {
      serverLog('info', 'Paddle event ignored', {
        eventType: event.event_type,
        eventId: event.event_id,
      });
    }
  }
};
