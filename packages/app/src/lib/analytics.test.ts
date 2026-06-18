import {analytics} from './analytics';

describe('analytics', () => {
  test('exports the configured client instance', () => {
    expect(analytics.platform).toBeTruthy();
  });
});
