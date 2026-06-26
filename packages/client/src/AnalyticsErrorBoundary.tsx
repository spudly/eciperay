/* eslint-disable no-restricted-syntax -- React error boundaries require a class component */
import React from 'react';

import {useAnalytics} from './AnalyticsProvider.js';

type AnalyticsErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type AnalyticsErrorBoundaryState = {error: Error | null};

class AnalyticsErrorBoundary extends React.Component<
  AnalyticsErrorBoundaryProps & {captureException: (error: Error) => void},
  AnalyticsErrorBoundaryState
> {
  override state: AnalyticsErrorBoundaryState = {error: null};

  static getDerivedStateFromError(error: Error): AnalyticsErrorBoundaryState {
    return {error};
  }

  override componentDidCatch(error: Error) {
    this.props.captureException(error);
  }

  override render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return null;
    }
    return this.props.children;
  }
}

export const AnalyticsErrorBoundaryProvider = ({
  children,
  fallback,
}: AnalyticsErrorBoundaryProps) => {
  const analytics = useAnalytics();

  return (
    <AnalyticsErrorBoundary
      captureException={error => {
        analytics.captureException(error);
      }}
      fallback={fallback}
    >
      {children}
    </AnalyticsErrorBoundary>
  );
};
