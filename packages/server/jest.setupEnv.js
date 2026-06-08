// Runs via setupFiles — before test framework and before test module imports.
// Sets up Node.js globals that packages like @supabase/realtime-js require
// during module initialisation.

// Supabase Realtime looks for a global WebSocket constructor.
// Node 20 doesn't have one; provide a stub so createClient() doesn't throw.
// The stub never connects — Realtime is not used in tests.
if (globalThis.WebSocket === undefined) {
  // eslint-disable-next-line no-empty-function -- stub constructor; body intentionally empty, never called
  globalThis.WebSocket = function StubWebSocket() {};
  globalThis.WebSocket.CONNECTING = 0;
  globalThis.WebSocket.OPEN = 1;
  globalThis.WebSocket.CLOSING = 2;
  globalThis.WebSocket.CLOSED = 3;
}
