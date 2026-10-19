import {
  API_BASE_URL as RAW_API_BASE_URL,
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
