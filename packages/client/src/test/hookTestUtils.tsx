import {setupI18n} from '@lingui/core';
import {I18nProvider} from '@lingui/react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import React from 'react';

import {AnalyticsProvider} from '../AnalyticsProvider.js';
import {AuthProvider} from '../AuthProvider.js';
import {
  createAnalytics,
  createNoopAnalyticsAdapter,
} from '../createAnalytics.js';

/**
 * Test harness for the shared host hooks (#676): a real AuthProvider
 * over a fake Supabase client (session with the given user id, or
 * signed out when null), a no-op analytics provider, an en-US Lingui
 * provider (message defaults render), and a non-retrying QueryClient.
 */
export const makeHookWrapper = (userId: string | null = 'user-uuid-1') => {
  const session = userId
    ? {
        access_token: 'test-token',
        user: {id: userId, email: 'test@example.com'},
      }
    : null;
  const supabase = {
    auth: {
      getSession: async () => ({data: {session}}),
      onAuthStateChange: () => ({
        data: {subscription: {unsubscribe: () => undefined}},
      }),
    },
  } as unknown as SupabaseClient;
  const i18n = setupI18n({locale: 'en-US', messages: {'en-US': {}}});
  const analytics = createAnalytics(createNoopAnalyticsAdapter(), 'web');
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}, mutations: {retry: false}},
  });
  const wrapper = ({children}: {children: React.ReactNode}) => (
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <AnalyticsProvider analytics={analytics}>
          <AuthProvider supabase={supabase}>{children}</AuthProvider>
        </AnalyticsProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
  return {wrapper, queryClient};
};
