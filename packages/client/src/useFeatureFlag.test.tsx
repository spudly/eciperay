import React from 'react';
import {renderHook, act} from '@testing-library/react';

import {AnalyticsProvider} from './AnalyticsProvider.js';
import {
  createAnalytics,
  createNoopAnalyticsAdapter,
} from './createAnalytics.js';
import {
  useFeatureFlag,
  useFeatureFlagEnabled,
  useExperimentVariant,
} from './useFeatureFlag.js';

describe('useFeatureFlag', () => {
  test('reads flag values and reacts to reload callbacks', () => {
    let listener: (() => void) | undefined;
    const getFeatureFlag = jest.fn(() => undefined as string | undefined);
    const analytics = createAnalytics(
      {
        ...createNoopAnalyticsAdapter(),
        getFeatureFlag,
        onFeatureFlags: callback => {
          listener = callback;
          return () => {
            listener = undefined;
          };
        },
      },
      'web',
    );
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <AnalyticsProvider analytics={analytics}>{children}</AnalyticsProvider>
    );
    const {result} = renderHook(() => useFeatureFlag('new-home'), {wrapper});
    expect(result.current).toBeUndefined();
    getFeatureFlag.mockReturnValue('enabled');
    act(() => {
      listener?.();
    });
    expect(result.current).toBe('enabled');
  });
});

describe('useFeatureFlagEnabled', () => {
  test('returns true only for boolean true flags', () => {
    const analytics = createAnalytics(
      {...createNoopAnalyticsAdapter(), getFeatureFlag: () => true},
      'web',
    );
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <AnalyticsProvider analytics={analytics}>{children}</AnalyticsProvider>
    );
    const {result} = renderHook(() => useFeatureFlagEnabled('flag'), {wrapper});
    expect(result.current).toBe(true);
  });
});

describe('useExperimentVariant', () => {
  test('returns multivariate flag values', () => {
    const analytics = createAnalytics(
      {...createNoopAnalyticsAdapter(), getFeatureFlag: () => 'variant-b'},
      'web',
    );
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <AnalyticsProvider analytics={analytics}>{children}</AnalyticsProvider>
    );
    const {result} = renderHook(() => useExperimentVariant('experiment'), {
      wrapper,
    });
    expect(result.current).toBe('variant-b');
  });
});
