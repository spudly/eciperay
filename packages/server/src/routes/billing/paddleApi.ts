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
  return response.json() as Promise<unknown>;
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

/** First Paddle customer id registered under an email. Null when none. */
export const findPaddleCustomerIdByEmail = async (
  email: string,
): Promise<string | null> => {
  const json = await paddleApiGet(
    `/customers?email=${encodeURIComponent(email)}`,
  );
  const data = (json as {data?: unknown} | null)?.data;
  const first = Array.isArray(data) ? asCustomer(data[0]) : {};
  return typeof first.id === 'string' && first.id.length > 0 ? first.id : null;
};

/**
 * All subscriptions Paddle reports for a customer, in API order. Returns null
 * when the request failed (vs. an empty list when Paddle answered with none),
 * so reconcile callers can tell failure from "no subscription".
 */
export const listPaddleSubscriptions = async (
  customerId: string,
): Promise<Record<string, unknown>[] | null> => {
  const json = await paddleApiGet(
    `/subscriptions?customer_id=${encodeURIComponent(customerId)}&per_page=100`,
  );
  if (json === null) {
    return null;
  }
  const data = (json as {data?: unknown}).data;
  if (!Array.isArray(data)) {
    return null;
  }
  return data.filter(
    (item): item is Record<string, unknown> =>
      item !== null && typeof item === 'object',
  );
};
