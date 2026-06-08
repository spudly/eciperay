import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {afterAll, afterEach} from '@jest/globals';
import {config} from 'dotenv';
import nock from 'nock';

// Load root .env so SUPABASE_URL and other vars are available for tests.
// override:true ensures real values from .env take precedence over the
// placeholder fallbacks set in jest.setupEnv.js (which runs before this file).
config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env'),
  override: true,
  quiet: true,
});

// Block all real HTTP connections to external services.
// Supertest's loopback connections (127.0.0.1) pass through automatically.
nock.disableNetConnect();
nock.enableNetConnect(/127\.0\.0\.1|localhost/u);

// resetMocks: true in jest.config.cjs handles jest.resetAllMocks() automatically.
afterEach(() => {
  nock.cleanAll();
});

// The Anthropic SDK uses a module-level KeepAliveAgent singleton. After a
// nock-intercepted request, the agent keeps the fake socket "alive" in its
// pool. The next test FILE would then try to reuse that stale fake socket
// instead of opening a new real connection that nock can intercept, resulting
// in a spurious "Connection error". Destroying the agent's socket pool after
// each file forces a fresh connection for every subsequent Anthropic request.
// The Anthropic SDK uses a module-level KeepAliveAgent (agentkeepalive) that
// keeps sockets alive after a nock-intercepted request. When tests run
// serially in the same worker, the next file would try to reuse the stale
// fake socket, bypassing nock and causing "Connection error". Destroying the
// agent pool after each file forces fresh connections. Use createRequire
// because the shim is CommonJS-only.
afterAll(() => {
  try {
    const req = createRequire(import.meta.url);
    const {getRuntime} = req('@anthropic-ai/sdk/_shims/node-runtime.js') as {
      getRuntime: () => {
        getDefaultAgent: (url: string) => {destroy?: () => void};
      };
    };
    getRuntime().getDefaultAgent('https://api.anthropic.com').destroy?.();
  } catch {
    // Non-fatal: agent cleanup is best-effort
  }
});
