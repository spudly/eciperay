import type {
  AnalyticsEventName,
  AnalyticsEventProperties,
  AnalyticsPlatform,
} from './analyticsEvents.js';

export type AnalyticsAdapter = {
  capture: (event: string, properties: Record<string, unknown>) => void;
  identify: (userId: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
};

const noopAnalyticsAction = () => {
  void 0;
};

export const createNoopAnalyticsAdapter = (): AnalyticsAdapter => ({
  capture: noopAnalyticsAction,
  identify: noopAnalyticsAction,
  reset: noopAnalyticsAction,
});

export const createAnalytics = (
  adapter: AnalyticsAdapter,
  platform: AnalyticsPlatform,
) => {
  const track = <E extends AnalyticsEventName>(
    event: E,
    properties: AnalyticsEventProperties[E],
  ) => {
    adapter.capture(event, {...properties, platform});
  };

  const identifyUser = (userId: string, traits?: {email?: string | null}) => {
    adapter.identify(userId, traits);
  };

  return {track, identifyUser, reset: adapter.reset, platform};
};

export type AnalyticsClient = ReturnType<typeof createAnalytics>;
