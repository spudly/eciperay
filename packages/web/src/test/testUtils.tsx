import {
  AnalyticsProvider,
  AuthProvider,
  createAnalytics,
  createNoopAnalyticsAdapter,
  FeedbackPreferenceProvider,
} from '@eciperay/client';
import {I18nProvider} from '@lingui/react';
import {VoiceProvider} from '@spudly/ui';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {
  act,
  render,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react';
import type {ReactElement, ReactNode} from 'react';
import {MemoryRouter, type MemoryRouterProps} from 'react-router-dom';

import {createI18n} from '../i18n/i18n.js';
import type {SupportedLocale} from '../i18n/locale.js';
import {eciperayVoice} from '../i18n/voice.js';
import {supabase} from '../lib/supabase.js';

const testAnalytics = createAnalytics(createNoopAnalyticsAdapter(), 'web');

export const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
      },
    },
  });

type WrapperOptions = {
  route?: string;
  routerProps?: MemoryRouterProps;
  queryClient?: QueryClient;
  withAuth?: boolean;
  locale?: SupportedLocale;
};

export const createWrapper = ({
  route = '/',
  routerProps,
  queryClient = makeQueryClient(),
  withAuth = true,
  locale = 'en-US',
}: WrapperOptions = {}) => {
  const Wrapper = ({children}: {children: ReactNode}) => {
    const inner = withAuth ? (
      <AuthProvider supabase={supabase}>{children}</AuthProvider>
    ) : (
      children
    );
    return (
      <I18nProvider i18n={createI18n(locale)}>
        <VoiceProvider voice={eciperayVoice}>
          <QueryClientProvider client={queryClient}>
            <AnalyticsProvider analytics={testAnalytics}>
              <FeedbackPreferenceProvider initialEnabled={false}>
                <MemoryRouter
                  initialEntries={[route]}
                  {...routerProps}
                >
                  {inner}
                </MemoryRouter>
              </FeedbackPreferenceProvider>
            </AnalyticsProvider>
          </QueryClientProvider>
        </VoiceProvider>
      </I18nProvider>
    );
  };
  return {Wrapper, queryClient};
};

export const renderWithProviders = async (
  ui: ReactElement,
  options: WrapperOptions & Omit<RenderOptions, 'wrapper'> = {},
): Promise<RenderResult> => {
  const {route, routerProps, queryClient, withAuth, locale, ...renderOptions} =
    options;
  const {Wrapper} = createWrapper({
    route,
    routerProps,
    queryClient,
    withAuth,
    locale,
  });
  let view!: RenderResult;
  await act(async () => {
    view = render(ui, {wrapper: Wrapper, ...renderOptions});
    await Promise.resolve();
  });
  return view;
};

export const settleAsyncUpdates = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
