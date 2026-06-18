import React, {createContext, useContext} from 'react';

import {
  createAnalytics,
  createNoopAnalyticsAdapter,
  type AnalyticsClient,
} from './createAnalytics.js';

const AnalyticsContext = createContext<AnalyticsClient | null>(null);

type AnalyticsProviderProps = {
  analytics: AnalyticsClient;
  children: React.ReactNode;
};

export const AnalyticsProvider = ({
  analytics,
  children,
}: AnalyticsProviderProps) => (
  <AnalyticsContext.Provider value={analytics}>
    {children}
  </AnalyticsContext.Provider>
);

export const useAnalytics = (): AnalyticsClient => {
  const analytics = useContext(AnalyticsContext);
  if (analytics) {
    return analytics;
  }
  return createAnalytics(createNoopAnalyticsAdapter(), 'web');
};
