import {useEffect, useState} from 'react';

import type {FeatureFlagValue} from './createAnalytics.js';
import {useAnalytics} from './AnalyticsProvider.js';

export const useFeatureFlag = (flagKey: string): FeatureFlagValue => {
  const analytics = useAnalytics();
  const [value, setValue] = useState<FeatureFlagValue>(() =>
    analytics.getFeatureFlag(flagKey),
  );

  useEffect(() => {
    const sync = () => {
      setValue(analytics.getFeatureFlag(flagKey));
    };
    sync();
    return analytics.onFeatureFlags(sync);
  }, [analytics, flagKey]);

  return value;
};

export const useFeatureFlagEnabled = (flagKey: string): boolean => {
  const value = useFeatureFlag(flagKey);
  return value === true;
};

export const useExperimentVariant = (flagKey: string): string | undefined => {
  const analytics = useAnalytics();
  const [variant, setVariant] = useState<string | undefined>(() =>
    analytics.getExperimentVariant(flagKey),
  );

  useEffect(() => {
    const sync = () => {
      setVariant(analytics.getExperimentVariant(flagKey));
    };
    sync();
    return analytics.onFeatureFlags(sync);
  }, [analytics, flagKey]);

  return variant;
};
