import {createHmac, timingSafeEqual} from 'node:crypto';

import type {Request} from 'express';

type RawBodyRequest = Request & {rawBody?: Buffer};

/**
 * Paddle signature format (Paddle Billing):
 *   Paddle-Signature: ts=<unix seconds>;h1=<hex>[;h1=<hex>...]
 *   h1 = HMAC-SHA256(webhook_secret, "<ts>:<raw body>")
 * Multiple h1 values may appear during secret rotation — any match is accepted.
 */
const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

type SignatureCheck =
  | {ok: true; rawBody: Buffer}
  | {ok: false; reason: string};

export const verifyPaddleSignature = (
  req: Request,
  webhookSecret: string,
): SignatureCheck => {
  const rawBody = (req as RawBodyRequest).rawBody;
  if (!rawBody) {
    return {ok: false, reason: 'missing raw body'};
  }
  const header = req.header('Paddle-Signature');
  if (!header) {
    return {ok: false, reason: 'missing signature header'};
  }
  const parts: Record<string, string[]> = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) {
      continue;
    }
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    (parts[key] ??= []).push(value);
  }
  const ts = parts['ts']?.[0];
  const signatures = parts['h1'] ?? [];
  if (!ts || signatures.length === 0) {
    return {ok: false, reason: 'malformed signature header'};
  }
  const tsMs = Number(ts) * 1000;
  if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > SIGNATURE_TOLERANCE_MS) {
    return {ok: false, reason: 'stale timestamp'};
  }
  const expected = createHmac('sha256', webhookSecret)
    .update(`${ts}:`)
    .update(rawBody)
    .digest();
  const matched = signatures.some(signature => {
    const actual = Buffer.from(signature, 'hex');
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  });
  return matched ? {ok: true, rawBody} : {ok: false, reason: 'signature mismatch'};
};
