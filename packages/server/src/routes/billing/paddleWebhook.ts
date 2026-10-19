import type {Request, Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {getPaddleConfig} from '../../lib/paddleConfig.js';
import {serverLog} from '../../lib/posthogLogs.js';

import {verifyPaddleSignature} from './paddleSignature.js';
import {handlePaddleEvent, type PaddleEvent} from './paddleEvents.js';

type QueryFn = typeof defaultQuery;

/**
 * POST /api/billing/paddle-webhook — no auth; HMAC-SHA256 signature
 * verification instead. Requires req.rawBody (stashed by the express.json
 * verify callback in server.ts).
 */
export const paddleWebhook = async (
  req: Request,
  res: Response,
  queryFn: QueryFn,
) => {
  const secret = getPaddleConfig().webhookSecret;
  if (!secret) {
    serverLog(
      'error',
      'Paddle webhook received but PADDLE_WEBHOOK_SECRET is not set',
    );
    res.status(500).json({error: 'webhook not configured'});
    return;
  }
  const verified = verifyPaddleSignature(req, secret);
  if (!verified.ok) {
    serverLog('warn', 'Rejected Paddle webhook with invalid signature', {
      reason: verified.reason,
    });
    res.status(401).json({error: 'invalid signature'});
    return;
  }
  let event: PaddleEvent;
  try {
    event = JSON.parse(verified.rawBody.toString('utf8')) as PaddleEvent;
  } catch {
    res.status(400).json({error: 'invalid JSON'});
    return;
  }
  if (!event.event_id || !event.event_type) {
    res.status(400).json({error: 'invalid event envelope'});
    return;
  }

  // Fast path for redeliveries.
  const seen = await queryFn(
    'select 1 from paddle_events where event_id = $1',
    [event.event_id],
  );
  if (seen.rows.length > 0) {
    res.status(200).json({received: true, duplicate: true});
    return;
  }

  try {
    await handlePaddleEvent(event, queryFn);
  } catch (error) {
    serverLog('error', 'Paddle webhook handler failed', {
      eventType: event.event_type,
      eventId: event.event_id,
      error: error instanceof Error ? error.message : String(error),
    });
    // 500 so Paddle retries; handler writes are idempotent upserts.
    res.status(500).json({error: 'handler failed'});
    return;
  }

  await queryFn(
    `insert into paddle_events (event_id, event_type)
     values ($1, $2) on conflict (event_id) do nothing`,
    [event.event_id, event.event_type],
  );
  res.status(200).json({received: true});
};
