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
    updated_at?: string;
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
  const current = await queryFn<{
    paddle_subscription_id: string | null;
    paddle_last_event_at: string | Date | null;
    superseded_subscription_id: string | null;
    superseded_last_event_at: string | Date | null;
  }>(
    `select paddle_subscription_id, paddle_last_event_at,
            superseded_subscription_id, superseded_last_event_at
       from subscriptions
      where paddle_subscription_id = $1 or superseded_subscription_id = $1`,
    [subscriptionId],
  );
  if (!current.rows[0]) {
    // No row yet: the creation event has not been applied (it may have
    // failed mapping and be awaiting Paddle's retry). Succeeding here
    // would record this status event as processed and lose it — when
    // the creation retry lands it would insert the pre-cancellation
    // state with nothing left to cancel it. Throw so this event stays
    // retryable too.
    throw new Error(
      `Paddle status event ${event.event_id} has no subscription row yet`,
    );
  }
  const row = current.rows[0];
  if (
    row.superseded_subscription_id === subscriptionId &&
    row.paddle_subscription_id !== subscriptionId
  ) {
    // Status event for the superseded subscription: its status does
    // not drive entitlement (the current subscription does), so just
    // advance its own clock and acknowledge — never touch the row's
    // subscription state, and never compare against the current
    // subscription's clock. The clock advances monotonically IN SQL
    // (greatest): overlapping deliveries can both pass the decision
    // above against the same read, and a plain assignment would let
    // the later write stamp the older clock over the newer one.
    const decision = shouldApplyEvent(event, row.superseded_last_event_at);
    if (decision.apply && decision.eventAt !== null) {
      const updated = await queryFn(
        `update subscriptions
            set superseded_last_event_at = greatest(
                  superseded_last_event_at, $2
                )
          where superseded_subscription_id = $1`,
        [subscriptionId, decision.eventAt],
      );
      if ((updated.rowCount ?? 0) === 0) {
        // Zero rows: a concurrent writer swapped the slot since the
        // SELECT (e.g. refresh promoted this subscription to
        // current), so the event was not applied to anything.
        // Returning normally would let the webhook record it as
        // processed and lose it — throw so Paddle redelivers and
        // the redelivery is re-evaluated against the newer state.
        throw new Error(
          `Paddle status event ${event.event_id} raced a subscription replacement`,
        );
      }
    }
    return;
  }
  const {apply, eventAt} = shouldApplyEvent(
    event,
    current.rows[0].paddle_last_event_at,
  );
  if (!apply) {
    return;
  }
  const extraSet =
    status === 'cancelled'
      ? ', cancel_at_period_end = true'
      : ', past_due_since = coalesce(past_due_since, now())';
  // Conditional on the stored clock still being the value the
  // ordering decision was made against ($4): if a concurrent writer
  // advanced it, this event's decision basis is gone — zero rows
  // match, and throwing keeps the event retryable instead of
  // stamping an older status over newer state or silently applying
  // nothing. The clock itself also only moves forward (greatest).
  const updated = await queryFn(
    `update subscriptions
        set status = $2${extraSet},
            paddle_last_event_at = greatest(
              paddle_last_event_at,
              coalesce($3, paddle_last_event_at)
            )
      where paddle_subscription_id = $1
        and paddle_last_event_at is not distinct from $4`,
    [subscriptionId, status, eventAt, row.paddle_last_event_at],
  );
  if ((updated.rowCount ?? 0) === 0) {
    throw new Error(
      `Paddle status event ${event.event_id} raced a newer subscription update`,
    );
  }
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
