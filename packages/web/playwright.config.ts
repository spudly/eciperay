import {defineConfig, devices} from '@playwright/test';

/**
 * Playwright e2e for the Eciperay web app (issue #184).
 *
 * The suite builds the web package in-job and serves it with `vite preview`.
 * Targeting the per-PR Fly review app was the preferred option in the issue,
 * but the review app's URL/timing is only known after its deploy job finishes,
 * which would serialize this job behind the deploy and couple test failures to
 * preview infrastructure; the in-job build is the exact same production bundle
 * (same `vite build`), so the flows exercise the real app.
 *
 * Self-contained by construction (see e2e/mockApi.ts): the build is pointed at
 * a fake Supabase project whose requests are all intercepted, a fabricated
 * session is seeded in localStorage for the authenticated specs, and every
 * /api/* response comes from fixtures. No test talks to production data, the
 * production API, or a real account.
 */
const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 30_000,
  use: {trace: 'retain-on-failure'},
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${PORT}`},
    },
  ],
  webServer: {
    command:
      'VITE_SUPABASE_URL=https://e2e.supabase.co ' +
      'VITE_SUPABASE_ANON_KEY=e2e-anon-key ' +
      'npx vite build --outDir dist-e2e && ' +
      `npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort --outDir dist-e2e`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
