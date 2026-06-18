import {render, screen} from '@testing-library/react';

import {AnalyticsProvider} from './AnalyticsProvider.js';
import {AnalyticsErrorBoundaryProvider} from './AnalyticsErrorBoundary.js';
import {
  createAnalytics,
  createNoopAnalyticsAdapter,
} from './createAnalytics.js';

describe('AnalyticsErrorBoundaryProvider', () => {
  test('captures render errors through analytics', () => {
    const captureException = jest.fn();
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const analytics = createAnalytics(
      {...createNoopAnalyticsAdapter(), captureException},
      'web',
    );
    const Broken = () => {
      throw new Error('render failed');
    };

    render(
      <AnalyticsProvider analytics={analytics}>
        <AnalyticsErrorBoundaryProvider fallback={<div>fallback</div>}>
          <Broken />
        </AnalyticsErrorBoundaryProvider>
      </AnalyticsProvider>,
    );

    expect(screen.getByText('fallback')).toBeTruthy();
    expect(captureException).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  test('renders nothing when no fallback is provided', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const analytics = createAnalytics(createNoopAnalyticsAdapter(), 'web');
    const Broken = () => {
      throw new Error('render failed');
    };

    const {container} = render(
      <AnalyticsProvider analytics={analytics}>
        <AnalyticsErrorBoundaryProvider>
          <Broken />
        </AnalyticsErrorBoundaryProvider>
      </AnalyticsProvider>,
    );

    expect(container.firstChild).toBeNull();
    consoleError.mockRestore();
  });
});
