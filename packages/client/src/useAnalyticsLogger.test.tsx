import React from 'react';
import {renderHook} from '@testing-library/react';

import {AnalyticsProvider} from './AnalyticsProvider.js';
import {
  createAnalytics,
  createNoopAnalyticsAdapter,
} from './createAnalytics.js';
import {useAnalyticsLogger} from './useAnalyticsLogger.js';

describe('useAnalyticsLogger', () => {
  test('forwards structured logs to analytics', () => {
    const log = jest.fn();
    const analytics = createAnalytics(
      {...createNoopAnalyticsAdapter(), log},
      'web',
    );
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <AnalyticsProvider analytics={analytics}>{children}</AnalyticsProvider>
    );
    const {result} = renderHook(() => useAnalyticsLogger(), {wrapper});
    result.current.info('server started', {port: 8080});
    expect(log).toHaveBeenCalledWith('info', 'server started', {port: 8080});
  });
});
