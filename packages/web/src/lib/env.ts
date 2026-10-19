const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL =
  typeof configuredApiBaseUrl === 'string' && configuredApiBaseUrl.length > 0
    ? configuredApiBaseUrl
    : '/api';
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
export const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY ?? '';
export const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST ?? '';
export const PADDLE_CLIENT_TOKEN =
  import.meta.env.VITE_PADDLE_CLIENT_TOKEN ?? '';
export const PADDLE_ENVIRONMENT =
  import.meta.env.VITE_PADDLE_ENVIRONMENT ?? 'production';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '';
