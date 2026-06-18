import {analytics} from './analytics.js';

describe('analytics', () => {
  test('exports the configured client instance', () => {
    expect(analytics.platform).toBe('web');
  });
});
