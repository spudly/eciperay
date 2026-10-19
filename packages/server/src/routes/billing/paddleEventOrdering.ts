import {serverLog} from '../../lib/posthogLogs.js';

import type {PaddleEvent} from './paddleEvents.js';

/**
 * The subscription's revision clock for ordering: the entity's own updated_at
 * when the payload carries it, else the event's occurred_at. One consistent
 * clock across writers is essential — webhook writes and refresh snapshots
 * describe the same revision, and refresh supplies updated_at; if webhook
 * writes stamped occurred_at instead (which lags updated_at by delivery time),
 * the same unchanged revision would compare as two different times and later
 * ordering decisions would misfire. Null when neither is present or parseable —
 * such events are applied without ordering checks (fail open).
 */
export const parseEventTime = (event: PaddleEvent): string | null => {
  const raw = event.data.updated_at ?? event.occurred_at;
  if (!raw) {
    return null;
  }
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
};

/**
 * Decides whether a subscription-state update from this event should be
 * applied. A delayed older event must never overwrite newer state (which could
 * restore paid access after a cancellation). Returns the event timestamp to
 * persist when the update is applied.
 */
/**
 * Pg returns timestamptz columns as Date objects at runtime (no type parser
 * override is configured), despite the string annotations on the row types.
 * Normalize to ISO before any comparison: an ISO string compared against a Date
 * with `>` is always false, which silently rejected every event after the first
 * for a stored subscription.
 */
export const normalizeTimestamp = (
  value: string | Date | null | undefined,
): string | null =>
  value instanceof Date ? value.toISOString() : (value ?? null);

export const shouldApplyEvent = (
  event: PaddleEvent,
  lastAppliedAt: string | Date | null,
): {apply: boolean; eventAt: string | null} => {
  const eventAt = parseEventTime(event);
  const lastAppliedIso = normalizeTimestamp(lastAppliedAt);
  if (!eventAt || !lastAppliedIso || eventAt > lastAppliedIso) {
    return {apply: true, eventAt};
  }
  serverLog('warn', 'Ignoring out-of-order Paddle event', {
    eventType: event.event_type,
    eventId: event.event_id,
    eventAt,
    lastAppliedAt: lastAppliedIso,
  });
  return {apply: false, eventAt};
};
