import {jest} from '@jest/globals';

/**
 * Regression test for the @anthropic-ai/sdk 1.x request contract (#447).
 *
 * SDK 1.x sends API version 2026-10-21 by default and presents the API key
 * as `Authorization: Bearer`, where 0.x sent 2023-06-01 and `X-Api-Key`.
 * This captures the outgoing request from the server's configured client
 * (anthropic.ts) with a stubbed global fetch — no network, no real key —
 * and pins those headers. It fails on SDK 0.134.0.
 */

type CapturedRequest = {url: string; headers: Headers};

const captured: CapturedRequest[] = [];

beforeEach(() => {
  captured.length = 0;
});

// Ordering is load-bearing: the stubbed fetch must be installed BEFORE
// anthropic.js is imported, because anthropic.ts resolves its fetch once,
// at module load (resolveAnthropicFetch). Keep the stub assignment and the
// dynamic import below together, in this order.
const originalFetch = globalThis.fetch;
const originalApiKey = process.env['ANTHROPIC_API_KEY'];
const originalFakeFlag = process.env['ECIPERAY_AI_FAKE'];

globalThis.fetch = (async (
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> => {
  const url =
    input instanceof Request ? input.url : String(input);
  const headers = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined),
  );
  captured.push({url, headers});
  return new Response(
    JSON.stringify({
      id: 'msg_test_headers',
      type: 'message',
      role: 'assistant',
      model: 'claude-haiku-4-5',
      content: [{type: 'text', text: 'ok'}],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {input_tokens: 1, output_tokens: 1},
    }),
    {status: 200, headers: {'content-type': 'application/json'}},
  );
}) as typeof fetch;

process.env['ANTHROPIC_API_KEY'] = 'test-api-key';
delete process.env['ECIPERAY_AI_FAKE'];

const {anthropic, HAIKU} = await import('./anthropic.js');

afterAll(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) {
    delete process.env['ANTHROPIC_API_KEY'];
  } else {
    process.env['ANTHROPIC_API_KEY'] = originalApiKey;
  }
  if (originalFakeFlag === undefined) {
    delete process.env['ECIPERAY_AI_FAKE'];
  } else {
    process.env['ECIPERAY_AI_FAKE'] = originalFakeFlag;
  }
  jest.restoreAllMocks();
});

describe('configured Anthropic client request contract (SDK 1.x)', () => {
  it('sends anthropic-version 2026-10-21 and Bearer auth, not X-Api-Key', async () => {
    await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 8,
      messages: [{role: 'user', content: 'ping'}],
    });

    expect(captured).toHaveLength(1);
    const request = captured[0];
    if (!request) {
      throw new Error('no request captured');
    }
    expect(request.url).toContain('/v1/messages');
    expect(request.headers.get('anthropic-version')).toBe('2026-10-21');
    expect(request.headers.get('authorization')).toBe(
      'Bearer test-api-key',
    );
    expect(request.headers.get('x-api-key')).toBeNull();
  });
});
