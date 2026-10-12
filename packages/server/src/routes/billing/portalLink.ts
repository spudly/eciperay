import type {Response as ExpressResponse} from 'express';

import {serverLog} from '../../lib/posthogLogs.js';
import type {EntitledRequest} from '../../middleware/loadEntitlement.js';

/**
 * POST /api/billing/portal-link — returns a Paddle customer-portal URL for the
 * user's Paddle customer. Upgrades, downgrades, cancellation, invoices, and
 * card updates all happen in Paddle's portal: we never build custom billing UI.
 */
export const portalLink = async (req: EntitledRequest, res: ExpressResponse) => {
  const apiKey = process.env['PADDLE_API_KEY'];
  if (!apiKey) {
    res.status(500).json({error: 'billing not configured'});
    return;
  }
  const customerId = req.entitlement.paddleCustomerId;
  if (!customerId) {
    res.status(404).json({error: 'no subscription'});
    return;
  }
  // Defaults to the sandbox API until Stephen cuts over to production.
  const apiBase =
    process.env['PADDLE_API_BASE'] ?? 'https://sandbox-api.paddle.com';
  let fetchResponse: globalThis.Response;
  try {
    fetchResponse = await fetch(
      `${apiBase}/customers/${encodeURIComponent(customerId)}/portal-sessions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      },
    );
  } catch (error) {
    serverLog('error', 'Paddle portal session request failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(502).json({error: 'failed to create portal session'});
    return;
  }
  if (!fetchResponse.ok) {
    serverLog('warn', 'Paddle portal session rejected', {
      status: fetchResponse.status,
    });
    res.status(502).json({error: 'failed to create portal session'});
    return;
  }
  const json = (await fetchResponse.json()) as {
    data?: {urls?: {general?: {overview?: unknown}}};
  };
  const url = json.data?.urls?.general?.overview;
  if (typeof url !== 'string' || url.length === 0) {
    serverLog('error', 'Paddle portal session returned unexpected shape');
    res.status(502).json({error: 'unexpected portal response'});
    return;
  }
  res.json({url});
};
