import {
  AnalyticsProvider,
  createAnalytics,
  createNoopAnalyticsAdapter,
} from '@eciperay/client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import type {ReactNode} from 'react';

const showcaseQueryClient = new QueryClient({
  defaultOptions: {queries: {retry: false}, mutations: {retry: false}},
});

const showcaseAnalytics = createAnalytics(createNoopAnalyticsAdapter(), 'ios');

export type ShowcaseDemoFrameProps = {children: ReactNode};

export const ShowcaseDemoFrame = ({children}: ShowcaseDemoFrameProps) => (
  <QueryClientProvider client={showcaseQueryClient}>
    <AnalyticsProvider analytics={showcaseAnalytics}>
      {children}
    </AnalyticsProvider>
  </QueryClientProvider>
);
