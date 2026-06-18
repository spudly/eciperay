import React from 'react';
import {renderHook} from '@testing-library/react';

import {AnalyticsProvider, useAnalytics} from './AnalyticsProvider.js';
import {
  createAnalytics,
  createNoopAnalyticsAdapter,
} from './createAnalytics.js';

describe('AnalyticsProvider', () => {
  test('useAnalytics returns the provided client inside the provider', () => {
    const analytics = createAnalytics(createNoopAnalyticsAdapter(), 'android');
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <AnalyticsProvider analytics={analytics}>{children}</AnalyticsProvider>
    );
    const {result} = renderHook(() => useAnalytics(), {wrapper});
    expect(result.current).toBe(analytics);
  });

  test('useAnalytics returns a noop client outside the provider', () => {
    const {result} = renderHook(() => useAnalytics());
    expect(result.current.platform).toBe('web');
    expect(() => {
      result.current.track('recipe_deleted', {recipe_id: 'recipe-1'});
      result.current.reset();
    }).not.toThrow();
  });
});
