import {
  createAnalytics,
  createNoopAnalyticsAdapter,
  type AnalyticsAdapter,
  type AnalyticsClient,
} from '@eciperay/client';
import posthog from 'posthog-js';

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

export const createPostHogAdapter = (
  apiKey: string,
  apiHost: string,
): AnalyticsAdapter => {
  posthog.init(apiKey, {
    api_host: apiHost,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: 'localStorage',
  });
  return {
    capture: (event, properties) => {
      posthog.capture(event, properties);
    },
    identify: (userId, properties) => {
      posthog.identify(userId, properties);
    },
    reset: () => {
      posthog.reset();
    },
  };
};

export const createWebAnalytics = (
  apiKey: string,
  apiHost: string,
): AnalyticsClient => {
  if (apiKey.length === 0) {
    return createAnalytics(createNoopAnalyticsAdapter(), 'web');
  }
  return createAnalytics(
    createPostHogAdapter(apiKey, apiHost || DEFAULT_POSTHOG_HOST),
    'web',
  );
};
