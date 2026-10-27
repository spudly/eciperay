import {defineConfig, devices} from '@playwright/test';

import {storageStatePath} from './e2e-live/qa.js';

/**
 * Live Playwright suite (issue #233): the mocked suite in ./e2e stays the fast,
 * self-contained PR gate; this suite exercises the same app against a REAL
 * backend — the Supabase QA dataset (the persistent `development` branch) — so
 * authenticated core flows get functional coverage the fixtures cannot
 * provide.
 *
 * Two ways to run:
 *
 * 1. In-job stack (CI, the default): `e2e-live/startStack.ts` builds the web
 *    package with the PREVIEW_VITE_* values, then boots the real API server
 *    (which also serves the built web app, exactly like the Fly deployments)
 *    with DATABASE_URL / SUPABASE_* wired from the PREVIEW_* secrets. This is
 *    the PR's own build against the QA dataset — never production data.
 * 2. External target: set E2E_BASE_URL (e.g. the persistent preview app,
 *    https://eciperay-next.fly.dev) and no local stack is started.
 *
 * The authenticated specs additionally need the dedicated CI test account (see
 * e2e-live/README.md): they skip with a stated reason until E2E_QA_EMAIL /
 * E2E_QA_PASSWORD are provided as secrets.
 */
const PORT = 8080;
const externalBaseUrl = process.env['E2E_BASE_URL'];
const baseURL = externalBaseUrl ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e-live',
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
  timeout: 60_000,
  use: {trace: 'retain-on-failure'},
  projects: [
    {
      name: 'setup',
      testMatch: 'auth.setup.ts',
      // No trace for the setup project: it types the QA account password,
      // and failure traces are uploaded as workflow artifacts — the
      // password must never land in one (see .github/workflows/e2e.yml).
      use: {...devices['Desktop Chrome'], baseURL, trace: 'off'},
    },
    {
      name: 'live-public',
      testMatch: 'public.spec.ts',
      use: {...devices['Desktop Chrome'], baseURL},
    },
    {
      name: 'live-auth',
      dependencies: ['setup'],
      testMatch:
        /(auth|recipes|cook-log|meal-plans|imports|sharing|sign-out)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL,
        storageState: storageStatePath,
      },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'npx tsx e2e-live/startStack.ts',
        url: `http://127.0.0.1:${PORT}/api/health`,
        // Never reuse an existing server: a local server already on the
        // port was booted with unknown env wiring, and the live suite
        // must only ever run against the stack startStack.ts wires to
        // the QA dataset (never a developer's — or production's — data).
        reuseExistingServer: false,
        timeout: 300_000,
      },
});
