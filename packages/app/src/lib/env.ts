import {
  API_BASE_URL as RAW_API_BASE_URL,
  E2E_FIXTURE_MODE as RAW_E2E_FIXTURE_MODE,
  POSTHOG_HOST as RAW_POSTHOG_HOST,
  POSTHOG_KEY as RAW_POSTHOG_KEY,
} from '@env';

import appPackageJson from '../../package.json';

export {SUPABASE_ANON_KEY, SUPABASE_URL} from '@env';

// The app package version (kept in sync across the monorepo) is the app
// version attached to analytics context such as feedback events.
export const APP_VERSION: string =
  typeof appPackageJson.version === 'string' ? appPackageJson.version : '';

export const API_BASE_URL: string =
  typeof RAW_API_BASE_URL === 'string'
    ? RAW_API_BASE_URL
    : 'http://localhost:8080/api';

export const POSTHOG_KEY =
  typeof RAW_POSTHOG_KEY === 'string' ? RAW_POSTHOG_KEY : '';

export const POSTHOG_HOST =
  typeof RAW_POSTHOG_HOST === 'string' ? RAW_POSTHOG_HOST : '';

/**
 * True only in the Android emulator CI build (#183 Phase 2): the flag is
 * baked at bundle time from the E2E_FIXTURE_MODE env var, which only the
 * emulator workflow job sets. Fixture mode swaps the Supabase client and
 * the API client for in-memory fixture implementations (see
 * lib/e2eFixtures) so the use-case suite runs with seeded data, no
 * production backend, and no real account. Release and preview builds
 * never set the var, so this is false there.
 */
export const E2E_FIXTURE_MODE: boolean = RAW_E2E_FIXTURE_MODE === 'true';
