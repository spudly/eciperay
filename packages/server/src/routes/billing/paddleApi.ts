import {serverLog} from '../../lib/posthogLogs.js';

/**
 * Minimal Paddle Billing API client (server-side only; the secret API key never
 * leaves the server). Used to recover subscription state the webhook path can
 * miss: mapping webhook events to users, and reconciling a user's entitlement
 * on demand.
 *
 * Defaults to the sandbox API until Stephen cuts over to production, same as
 * portalLink.
 */
export const paddleApiBase = (): string =>
  process.env['PADDLE_API_BASE'] ?? 'https://sandbox-api.paddle.com';

/**
 * GET a Paddle API path and return the parsed JSON body, or null when the API
 * key is not configured, the request fails, or Paddle returns a non-2xx status.
 * Callers that must distinguish "not configured" from "request failed" check
 * `process.env['PADDLE_API_KEY']` themselves.
 */
export const paddleApiGet = async (path: string): Promise<unknown> => {
  const apiKey = process.env['PADDLE_API_KEY'];
  if (!apiKey) {
    return null;
  }
  let response: globalThis.Response;
  try {
    response = await fetch(`${paddleApiBase()}${path}`, {
      headers: {Authorization: `Bearer ${apiKey}`},
    });
  } catch (error) {
    serverLog('error', 'Paddle API request failed', {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
  if (!response.ok) {
    serverLog('warn', 'Paddle API request rejected', {
      path,
      status: response.status,
    });
    return null;
  }
  try {
    return (await response.json()) as unknown;
  } catch (error) {
    serverLog('error', 'Paddle API response body unreadable', {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

type PaddleCustomer = {id?: unknown; email?: unknown};

const asCustomer = (value: unknown): PaddleCustomer =>
  value && typeof value === 'object' ? (value as PaddleCustomer) : {};

/** Email for a Paddle customer id, via the API. Null when unresolvable. */
export const fetchPaddleCustomerEmail = async (
  customerId: string,
): Promise<string | null> => {
  const json = await paddleApiGet(
    `/customers/${encodeURIComponent(customerId)}`,
  );
  const email = asCustomer((json as {data?: unknown} | null)?.data).email;
  return typeof email === 'string' && email.length > 0 ? email : null;
};

/**
 * First Paddle customer id registered under an email. Null when Paddle answered
 * with none. THROWS when the lookup itself failed (paddleApiGet returned null):
 * callers must not mistake a failed lookup for "no such customer" — for
 * entitlement refresh that would silently report the stale entitlement as if
 * reconciliation had succeeded.
 */
export const findPaddleCustomerIdByEmail = async (
  email: string,
): Promise<string | null> => {
  const json = await paddleApiGet(
    `/customers?email=${encodeURIComponent(email)}`,
  );
  if (json === null) {
    throw new Error('Paddle customer lookup failed');
  }
  const data = (json as {data?: unknown}).data;
  const first = Array.isArray(data) ? asCustomer(data[0]) : {};
  return typeof first.id === 'string' && first.id.length > 0 ? first.id : null;
};

/**
 * All subscriptions Paddle reports for a customer, in API order, across every
 * page. Returns null when any page request fails (vs. an empty list when Paddle
 * answered with none), so reconcile callers can tell failure from "no
 * subscription" — and never reconcile from a partial list, which could select a
 * historical subscription over the active one sitting on a later page. Paddle
 * paginates with an `after` cursor (the last id of the page); a page shorter
 * than per_page is the last one.
 */
export const listPaddleSubscriptions = async (
  customerId: string,
): Promise<Record<string, unknown>[] | null> => {
  const perPage = 100;
  const all: Record<string, unknown>[] = [];
  let after: string | null = null;
  for (let page = 0; page < 50; page += 1) {
    const cursor = after === null ? '' : `&after=${encodeURIComponent(after)}`;
    const json = await paddleApiGet(
      `/subscriptions?customer_id=${encodeURIComponent(customerId)}&per_page=${perPage}${cursor}`,
    );
    if (json === null) {
      return null;
    }
    const data = (json as {data?: unknown}).data;
    if (!Array.isArray(data)) {
      return null;
    }
    all.push(
      ...data.filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === 'object',
      ),
    );
    if (data.length < perPage) {
      return all;
    }
    const lastRaw: unknown = data[data.length - 1];
    const lastId =
      lastRaw !== null &&
      typeof lastRaw === 'object' &&
      typeof (lastRaw as {id?: unknown}).id === 'string'
        ? (lastRaw as {id: string}).id
        : null;
    if (lastId === null || lastId === after) {
      // A full page we cannot advance past: stop rather than loop.
      return all;
    }
    after = lastId;
  }
  return all;
};

/**
 * Current status of one subscription, via the API. Null when the request fails
 * or the response carries no status — callers must treat null as "unknown",
 * never as a status.
 */
export const fetchPaddleSubscriptionStatus = async (
  subscriptionId: string,
): Promise<string | null> => {
  const json = await paddleApiGet(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
  );
  const status = (json as {data?: {status?: unknown}} | null)?.data?.status;
  return typeof status === 'string' && status.length > 0 ? status : null;
};
