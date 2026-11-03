/**
 * Optimistic concurrency for the meal and meal-plan PUT endpoints (#384).
 *
 * The concurrency token is the record's `updatedAt` timestamp: GET detail
 * responses already expose it, and the detail responses also carry it as an
 * `ETag` header. A client doing read-merge-PUT sends the token back, either as
 * the standard `If-Match` header or as the `expectedUpdatedAt` body field, and
 * the replace functions refuse with 409 when the stored `updated_at` no longer
 * matches — instead of silently overwriting a concurrent edit. Clients that
 * send no token keep the old unconditional full-replace behavior.
 */

/**
 * Normalize a stored timestamp or a client token to the ISO string the API
 * exposes. node-postgres returns timestamptz columns as JS Date objects, whose
 * millisecond precision is also all an ISO token can carry, so both
 * representations of the same instant normalize to the same string. Unparseable
 * values pass through unchanged, so they simply never match a real stored
 * timestamp.
 */
export const updatedAtToken = (value: string | Date): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? value : new Date(parsed).toISOString();
};

/** True when the client's token names the stored record's current state. */
export const updatedAtMatches = (
  storedUpdatedAt: string | Date,
  expectedUpdatedAt: string,
): boolean =>
  updatedAtToken(storedUpdatedAt) === updatedAtToken(expectedUpdatedAt);

/**
 * Resolve the token a PUT carries: the `If-Match` header wins over the
 * `expectedUpdatedAt` body field. Header values may be quoted ETags
 * (`"2026-…"`, optionally weak `W/"…"`) or a bare timestamp. `If-Match: *`
 * asserts only that the record exists — which the replace functions already
 * enforce with their 404 — so it resolves to no token.
 */
export const resolveExpectedUpdatedAt = (
  ifMatchHeader: string | undefined,
  bodyExpectedUpdatedAt: string | undefined,
): string | undefined => {
  if (ifMatchHeader) {
    const candidates = ifMatchHeader
      .split(',')
      .map(candidate =>
        candidate.trim().replace(/^W\//, '').replace(/^"|"$/g, ''),
      )
      .filter(candidate => candidate.length > 0);
    const first = candidates[0];
    if (first && first !== '*') {
      return first;
    }
    if (first === '*') {
      return undefined;
    }
  }
  return bodyExpectedUpdatedAt;
};

/** The 409 result the replace functions return for a stale token. */
export const staleWriteConflict = (
  resource: 'Meal' | 'Meal plan',
): {error: string; status: number} => ({
  error: `${resource} has been modified since it was loaded`,
  status: 409,
});
