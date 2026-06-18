// Runs via setupFiles — before test framework and before test module imports.
// Sets up Node.js globals that packages like @supabase/realtime-js require
// during module initialisation.

// Supabase Realtime looks for a global WebSocket constructor.
// Node 20 doesn't have one; provide a stub so createClient() doesn't throw.
// The stub never connects — Realtime is not used in tests.
if (globalThis.WebSocket === undefined) {
  globalThis.WebSocket = function StubWebSocket() {};
  globalThis.WebSocket.CONNECTING = 0;
  globalThis.WebSocket.OPEN = 1;
  globalThis.WebSocket.CLOSING = 2;
  globalThis.WebSocket.CLOSED = 3;
}

// Provide placeholder env vars so SDK clients initialise without throwing
// when no .env file is present (e.g. in CI). All real HTTP calls are
// intercepted by nock, so the values only need to be non-empty/valid-looking.
// jest.setup.ts loads the real .env with override:true, so local runs still
// use the actual values from that file.
process.env.SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY || 'test-placeholder-key';
process.env.ANTHROPIC_API_KEY =
  process.env.ANTHROPIC_API_KEY || 'test-placeholder-anthropic-key';
process.env.POSTHOG_KEY = process.env.POSTHOG_KEY || '';
