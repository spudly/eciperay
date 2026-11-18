/// <reference types="vite/client" />

// Lingui catalogs are imported as .po files and compiled on the fly by
// @lingui/vite-plugin (#588); there is no committed compiled catalog.
declare module '*.po' {
  import type {Messages} from '@lingui/core';
  export const messages: Messages;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly VITE_PADDLE_CLIENT_TOKEN?: string;
  readonly VITE_PADDLE_ENVIRONMENT?: string;
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
