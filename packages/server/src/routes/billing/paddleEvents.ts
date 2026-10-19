import {query as defaultQuery} from '../../db/query.js';
import {serverLog} from '../../lib/posthogLogs.js';

import {shouldApplyEvent} from './paddleEventOrdering.js';
import {
  resolveSubscriptionUserId,
  upsertSubscription,
} from './subscriptionUpsert.js';

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

/**
 * Applies a subscription.canceled / subscription.past_due status update,
 * honoring event ordering: a delayed older event never overwrites newer state.
 * The event timestamp is persisted when present so later events can be ordered
 * against it.
 */
const applyOrderedStatusUpdate = async (
  event: PaddleEvent,
  subscriptionId: string,
  status: 'cancelled' | 'past_due',
  queryFn: QueryFn,
): Promise<void> => {
  const current = await queryFn<{paddle_last_event_at: string | null}>(
    `select paddle_last_event_at from subscriptions
      where paddle_subscription_id = $1`,
    [subscriptionId],
  );
  const {apply, eventAt} = shouldApplyEvent(
    event,
    current.rows[0]?.paddle_last_event_at ?? null,
  );
  if (!apply) {
    return;
  }
  const extraSet =
    status === 'cancelled'
      ? ', cancel_at_period_end = true'
      : ', past_due_since = coalesce(past_due_since, now())';
  await queryFn(
    `update subscriptions
        set status = $2${extraSet},
            paddle_last_event_at = coalesce($3, paddle_last_event_at)
      where paddle_subscription_id = $1`,
    [subscriptionId, status, eventAt],
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
      const userId = await resolveSubscriptionUserId(event, queryFn);
      if (!userId) {
        serverLog('error', 'Paddle event could not be mapped to a user', {
          eventType: event.event_type,
          eventId: event.event_id,
        });
        // Throw (not just log) so the webhook returns 500 and does NOT
        // record the event as processed: Paddle retries, and a later
        // delivery can succeed once the user/customer mapping exists.
        // Returning here would lose the purchase permanently.
        throw new Error(
          `Paddle event ${event.event_id} could not be mapped to a user`,
        );
      }
      await upsertSubscription(event, userId, queryFn);
      return;
    }
    case 'subscription.canceled': {
      const subscriptionId = event.data.id;
      if (subscriptionId) {
        await applyOrderedStatusUpdate(
          event,
          subscriptionId,
          'cancelled',
          queryFn,
        );
      }
      return;
    }
    case 'subscription.past_due': {
      const subscriptionId = event.data.id;
      if (subscriptionId) {
        await applyOrderedStatusUpdate(
          event,
          subscriptionId,
          'past_due',
          queryFn,
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
