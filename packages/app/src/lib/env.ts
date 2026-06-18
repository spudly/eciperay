import {
  API_BASE_URL as RAW_API_BASE_URL,
  POSTHOG_HOST as RAW_POSTHOG_HOST,
  POSTHOG_KEY as RAW_POSTHOG_KEY,
} from '@env';

export {SUPABASE_ANON_KEY, SUPABASE_URL} from '@env';

export const API_BASE_URL: string =
  typeof RAW_API_BASE_URL === 'string'
    ? RAW_API_BASE_URL
    : 'http://localhost:8080/api';

export const POSTHOG_KEY =
  typeof RAW_POSTHOG_KEY === 'string' ? RAW_POSTHOG_KEY : '';

export const POSTHOG_HOST =
  typeof RAW_POSTHOG_HOST === 'string' ? RAW_POSTHOG_HOST : '';
