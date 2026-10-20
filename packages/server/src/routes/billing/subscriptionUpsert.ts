import {query as defaultQuery} from '../../db/query.js';
import {serverLog} from '../../lib/posthogLogs.js';

import type {PaddleEvent} from './paddleEvents.js';
import {
  fetchPaddleCustomerEmail,
  fetchPaddleSubscriptionState,
} from './paddleApi.js';
import {
  normalizeTimestamp,
  parseEventTime,
  shouldApplyEvent,
} from './paddleEventOrdering.js';

type QueryFn = typeof defaultQuery;

// Pre-upgrade rows carry revision clocks stamped from occurred_at,
// which lags the entity's updated_at by Paddle's event-creation
// latency (sub-second in practice). When such a subscription is
// later superseded, its legacy clock lands in the superseded slot,
// and the unchanged subscription's own updated_at then compares as
// slightly OLDER than the slot — blocking its reselection after
// the replacement is canceled and stranding a paying user on Free.
// Snapshot reselection therefore tolerates a small skew against
// the superseded clock. The tolerance is far below any realistic
// gap between distinct revisions (plan changes, cancellations and
// reactivations are separate user actions, minutes apart), so
// stale-revision protection is preserved.
const LEGACY_CLOCK_SKEW_MS = 2000;

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
  /**
   * Snapshot mode only: the selection state the caller's decision was based on
   * — the ids in its fetched list plus the subscription stored when the list
   * was fetched. If the row's current subscription at write time is outside
   * this set, a webhook installed a subscription the list never contained while
   * the caller was deciding; the snapshot replacement branches then refuse
   * ('stale') rather than overwrite it, and the caller re-fetches and re-ranks
   * against fresh state. Omitted = no mid-flight guard (callers that read the
   * row themselves at decision time).
   */
  knownSelectionIds?: ReadonlySet<string>;
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
  // See UpsertOptions.knownSelectionIds: the write-time selection
  // is not one the snapshot caller ever saw, so its list is stale
  // in a way its own ranking cannot arbitrate.
  const selectionMovedMidFlight =
    options.snapshot === true &&
    options.knownSelectionIds !== undefined &&
    storedId !== null &&
    !options.knownSelectionIds.has(storedId);
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
    // own clock — but the mode and status decide what applying it
    // means:
    const supersededAt = normalizeTimestamp(
      existingRow.superseded_last_event_at,
    );
    const candidateAt = parseEventTime(event);
    if (options.snapshot === true) {
      // The caller selected this candidate from Paddle's live state.
      // An EQUAL revision must be allowed to reselect it: if the
      // current subscription was canceled while this one stayed
      // active, its updated_at never moved past the superseded
      // clock, and rejecting it would strand the canceled
      // subscription as current. Only an older snapshot is stale.
      if (selectionMovedMidFlight) {
        // The current subscription was installed after the
        // caller's list was fetched (e.g. a newly activated
        // subscription's webhook landed mid-refresh): reselecting
        // this superseded candidate from the stale list would
        // replace it. Refuse; the caller re-fetches and re-ranks.
        serverLog(
          'warn',
          'Paddle snapshot reselection raced a newer selection',
          {
            eventType: event.event_type,
            eventId: event.event_id,
            subscriptionId: eventSubId,
            currentSubscriptionId: storedId ?? 'unknown',
          },
        );
        return 'stale';
      }
      if (
        candidateAt !== null &&
        supersededAt !== null &&
        Date.parse(candidateAt) <
          Date.parse(supersededAt) - LEGACY_CLOCK_SKEW_MS
      ) {
        return 'stale';
      }
      eventAt = candidateAt;
      recordSwap();
    } else if (mappedStatus !== 'active') {
      // A canceled or past_due revision never promotes over the
      // current subscription: its clock advanced precisely because
      // it was canceled or went delinquent, so "newer" carries no
      // entitlement claim — swapping it in could downgrade an
      // active subscription to delinquent, then Free when grace
      // expires. Advance the superseded clock only, as the
      // status-only handler does.
      if (
        candidateAt === null ||
        (supersededAt !== null && candidateAt <= supersededAt)
      ) {
        return 'stale';
      }
      // Conditional on the superseded slot still holding THIS
      // subscription: a concurrent writer may have swapped the slot
      // since the SELECT above, and stamping this subscription's
      // clock into a different subscription's slot would corrupt
      // its ordering. The clock advances monotonically IN SQL
      // (greatest): two overlapping handlers can both pass the
      // candidateAt check above against the same read, and a plain
      // assignment would let the later write stamp the OLDER clock
      // over the newer one, letting a delayed active revision
      // promote a subscription whose cancellation was processed.
      const updated = await queryFn(
        `update subscriptions
            set superseded_last_event_at = greatest(
                  superseded_last_event_at, $2
                )
          where user_id = $1 and superseded_subscription_id = $3`,
        [userId, candidateAt, eventSubId],
      );
      if ((updated.rowCount ?? 0) === 0) {
        // Zero rows: the slot changed since the SELECT (e.g. refresh
        // promoted this subscription to current). The event has NOT
        // been applied to the state that replaced it, and returning
        // normally would let the webhook record it as processed and
        // lose the cancellation/past-due for good. Throw so the
        // webhook 500s and Paddle redelivers; the redelivery is
        // re-evaluated against the newer state.
        throw new Error(
          `Paddle event ${event.event_id} raced a subscription replacement`,
        );
      }
      return 'applied';
    } else {
      // A genuinely newer live revision of the superseded
      // subscription makes it current again.
      const decision = shouldApplyEvent(
        event,
        existingRow.superseded_last_event_at,
      );
      if (!decision.apply) {
        return 'stale';
      }
      // Promotion is a takeover: verify it against Paddle's live
      // state, exactly like the untracked-subscription path. The
      // superseded clock alone cannot see a cancellation whose
      // webhook was lost — a delayed active revision would
      // otherwise promote a subscription Paddle has since
      // canceled, replacing the current one with an obsolete
      // active plan. A confirmed non-active status, or a live
      // revision newer than the event's, makes the event stale;
      // unavailable verification throws so delivery stays
      // retryable.
      if (eventSubId !== null) {
        const live = await fetchPaddleSubscriptionState(eventSubId);
        if (live === null) {
          throw new Error(
            `Paddle live verification unavailable for subscription ${eventSubId}`,
          );
        }
        const liveUpdatedAt = live.updatedAt;
        const liveUpdatedMs =
          liveUpdatedAt !== null ? Date.parse(liveUpdatedAt) : Number.NaN;
        if (
          mapPaddleStatus(live.status) !== 'active' ||
          (decision.eventAt !== null &&
            liveUpdatedAt !== null &&
            !Number.isNaN(liveUpdatedMs) &&
            liveUpdatedMs > Date.parse(decision.eventAt))
        ) {
          serverLog(
            'warn',
            'Paddle superseded promotion failed live verification',
            {
              eventType: event.event_type,
              eventId: event.event_id,
              subscriptionId: eventSubId,
              liveStatus: live.status,
            },
          );
          return 'stale';
        }
      }
      eventAt = decision.eventAt;
      recordSwap();
    }
  } else if (strictlyDifferent && options.snapshot === true) {
    // Snapshot replacement, decided against this write-time row (a
    // concurrent webhook may have replaced the row since the caller
    // read it): applies without the revision guard, stamped with
    // its OWN timestamp — never the outgoing subscription's clock.
    //
    // But the caller's list can itself be stale by write time: if
    // this candidate was canceled after the list was fetched, the
    // canceling webhook lands in the untracked-subscription branch
    // below, reports 'stale', and retains no revision for it — so
    // nothing stops this older active snapshot from reactivating
    // the canceled subscription. Verify the candidate's live state
    // at write time: the snapshot installs only while Paddle still
    // reports the same status at no newer revision. A mismatch
    // means the snapshot no longer represents Paddle's state —
    // 'stale', and the caller's re-fetch re-ranks fresh data. If
    // Paddle cannot be checked at all, throw (the caller surfaces a
    // retryable error) rather than install unverified state.
    if (selectionMovedMidFlight) {
      // The current subscription is not one the caller ever saw:
      // a webhook installed it after the list was fetched (e.g. a
      // newly activated subscription). The candidate's own live
      // check cannot detect that — refuse and let the caller
      // re-fetch and re-rank with the new subscription listed.
      serverLog('warn', 'Paddle snapshot replacement raced a newer selection', {
        eventType: event.event_type,
        eventId: event.event_id,
        subscriptionId: eventSubId ?? 'unknown',
        currentSubscriptionId: storedId ?? 'unknown',
      });
      return 'stale';
    }
    if (eventSubId !== null) {
      const live = await fetchPaddleSubscriptionState(eventSubId);
      if (live === null) {
        throw new Error(
          `Paddle live verification unavailable for subscription ${eventSubId}`,
        );
      }
      const candidateAt = parseEventTime(event);
      const liveUpdatedMs =
        live.updatedAt !== null ? Date.parse(live.updatedAt) : Number.NaN;
      const movedPastSnapshot =
        live.status !== event.data.status ||
        (candidateAt !== null &&
          !Number.isNaN(liveUpdatedMs) &&
          liveUpdatedMs > Date.parse(candidateAt));
      if (movedPastSnapshot) {
        serverLog(
          'warn',
          'Paddle snapshot candidate superseded by live state',
          {
            eventType: event.event_type,
            eventId: event.event_id,
            subscriptionId: eventSubId,
            liveStatus: live.status,
          },
        );
        return 'stale';
      }
    }
    eventAt = parseEventTime(event);
    recordSwap();
  } else {
    if (
      options.snapshot !== true &&
      positivelyDifferent &&
      mappedStatus !== 'active'
    ) {
      // Webhook event for a subscription this row does not track —
      // neither current nor the remembered superseded one (e.g. a
      // delayed event for a subscription replaced two generations
      // ago, whose history no longer fits the single superseded
      // slot). A non-active state must never overwrite the selected
      // subscription; live takeovers keep the ordering guard below,
      // and snapshot refresh reconciles anything else.
      serverLog('warn', 'Paddle event for untracked subscription ignored', {
        eventType: event.event_type,
        eventId: event.event_id,
        subscriptionId: eventSubId,
        status: mappedStatus,
      });
      return 'stale';
    }
    const decision = shouldApplyEvent(event, existingRow.paddle_last_event_at);
    if (!decision.apply) {
      // Snapshot mode, same subscription, EQUAL revision: the
      // stored clock can have been advanced by a partial write —
      // the status-only handler stamps the revision while leaving
      // fields like the billing period at their pre-event values,
      // so an immediate cancellation processed there first leaves
      // a stale future period end that the entitlement resolver
      // would keep granting against. The snapshot carries this
      // revision's COMPLETE state from Paddle, so persisting it is
      // the correct completion of the revision, not an out-of-order
      // write; the conditional-write guards below still bind the
      // write to the state read here. Older revisions stay stale,
      // and webhook (non-snapshot) equal revisions stay no-ops —
      // events are deltas, snapshots are full state.
      const equalRevisionSnapshot =
        options.snapshot === true &&
        storedId !== null &&
        eventSubId === storedId &&
        decision.eventAt !== null &&
        decision.eventAt ===
          normalizeTimestamp(existingRow.paddle_last_event_at);
      if (!equalRevisionSnapshot) {
        return 'stale';
      }
    }
    if (
      options.snapshot !== true &&
      positivelyDifferent &&
      mappedStatus === 'active' &&
      eventSubId !== null
    ) {
      // An untracked subscription claiming the row with a live
      // status: verify it against Paddle's current state before
      // promoting. A delayed event can describe a subscription
      // that has since been canceled — its ordering history no
      // longer fits the single superseded slot, so the stored
      // clocks cannot arbitrate it. A CONFIRMED no-longer-live
      // status drops the claim; snapshot refresh reconciles the
      // truth.
      const live = await fetchPaddleSubscriptionState(eventSubId);
      if (live === null) {
        // Verification unavailable (request failed or the response
        // carried no status): unknown is not "not live". Returning
        // here would let the webhook record the event as processed
        // and drop a genuine takeover — a transient Paddle 503
        // during a real active replacement would silently deny the
        // access the user paid for. Throw so the webhook 500s and
        // Paddle retries.
        throw new Error(
          `Paddle live verification unavailable for subscription ${eventSubId}`,
        );
      }
      if (live.status !== 'active' && live.status !== 'trialing') {
        serverLog('warn', 'Paddle takeover event failed live verification', {
          eventType: event.event_type,
          eventId: event.event_id,
          subscriptionId: eventSubId,
          liveStatus: live.status,
        });
        return 'stale';
      }
      // Live status alone does not validate the event's PRICE or
      // revision: a delayed event can carry a historical price for
      // a subscription that is still active — e.g. its Power
      // revision from before a downgrade to Plus that was already
      // processed and later superseded, so no stored clock covers
      // it. If Paddle's live revision is NEWER than the revision
      // this event claims, the event is historical whatever its
      // status says: drop it rather than restore the old price.
      const liveUpdatedAt = live.updatedAt;
      const liveUpdatedMs =
        liveUpdatedAt !== null ? Date.parse(liveUpdatedAt) : Number.NaN;
      if (
        decision.eventAt !== null &&
        liveUpdatedAt !== null &&
        !Number.isNaN(liveUpdatedMs) &&
        liveUpdatedMs > Date.parse(decision.eventAt)
      ) {
        serverLog('warn', 'Paddle takeover event superseded by live revision', {
          eventType: event.event_type,
          eventId: event.event_id,
          subscriptionId: eventSubId,
          liveUpdatedAt,
        });
        return 'stale';
      }
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

  // The conflict update is conditional on the stored row still
  // being exactly the state the SELECT above decided against: the
  // current subscription id ($14), its revision clock ($15), and
  // the superseded slot's id and clock ($16, $17). The same-vs-
  // replacement decision, the ordering decision, and the superseded
  // values below were all computed from that state. A concurrent
  // writer that swapped the subscription — OR merely advanced a
  // clock, e.g. an acknowledged cancellation committing while a
  // refresh INSERT is in flight — invalidates the decision even
  // when the current id is unchanged: writing anyway could restore
  // the canceled subscription's active status and rewind its clock
  // to this event's older revision. And when the superseded slot
  // still holds the SAME subscription after the write, its clock
  // only moves forward (greatest), for the same reason.
  const written = await queryFn(
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
       superseded_last_event_at = case
         when subscriptions.superseded_subscription_id is not distinct from
              excluded.superseded_subscription_id
           then greatest(
                  subscriptions.superseded_last_event_at,
                  excluded.superseded_last_event_at
                )
         else excluded.superseded_last_event_at
       end,
       paddle_last_event_at = coalesce(
         excluded.paddle_last_event_at,
         subscriptions.paddle_last_event_at
       )
     where subscriptions.paddle_subscription_id is not distinct from $14
       and subscriptions.paddle_last_event_at is not distinct from $15
       and subscriptions.superseded_subscription_id is not distinct from $16
       and subscriptions.superseded_last_event_at is not distinct from $17`,
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
      storedId,
      existingRow?.paddle_last_event_at ?? null,
      supersededId,
      existingRow?.superseded_last_event_at ?? null,
    ],
  );
  if ((written.rowCount ?? 0) === 0) {
    // The WHERE rejected the update: a concurrent writer changed
    // the stored subscription or one of its clocks after the
    // SELECT. Nothing was written from this event's stale decision
    // basis — throw so the caller does not acknowledge it (webhook
    // 500 → Paddle redelivers; refresh 500 → the client retries)
    // and the redelivery is re-evaluated against the newer state.
    throw new Error(
      `Paddle event ${event.event_id} raced a subscription replacement`,
    );
  }
  return 'applied';
};

export const resolveSubscriptionUserId = resolveUserId;
