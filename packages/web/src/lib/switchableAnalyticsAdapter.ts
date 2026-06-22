import {
  createNoopAnalyticsAdapter,
  type AnalyticsAdapter,
} from '@eciperay/client';

/* eslint-disable max-lines-per-function -- switchable adapter delegates every analytics method */
export const createSwitchableAnalyticsAdapter = (
  initialAdapter: AnalyticsAdapter = createNoopAnalyticsAdapter(),
) => {
  let activeAdapter = initialAdapter;
  const adapter: AnalyticsAdapter = {
    capture: (event, properties) => {
      activeAdapter.capture(event, properties);
    },
    identify: (userId, properties) => {
      activeAdapter.identify(userId, properties);
    },
    reset: () => {
      activeAdapter.reset();
    },
    isFeatureEnabled: key => activeAdapter.isFeatureEnabled?.(key),
    getFeatureFlag: key => activeAdapter.getFeatureFlag?.(key),
    getFeatureFlagPayload: key => activeAdapter.getFeatureFlagPayload?.(key),
    onFeatureFlags: callback => activeAdapter.onFeatureFlags?.(callback),
    reloadFeatureFlags: () => {
      activeAdapter.reloadFeatureFlags?.();
    },
    captureException: (error, properties) => {
      activeAdapter.captureException?.(error, properties);
    },
    log: (level, message, attributes) => {
      activeAdapter.log?.(level, message, attributes);
    },
  };

  return {
    adapter,
    setAdapter: (nextAdapter: AnalyticsAdapter) => {
      activeAdapter = nextAdapter;
    },
  };
};
