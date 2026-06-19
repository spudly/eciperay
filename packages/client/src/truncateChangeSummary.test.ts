import {truncateChangeSummary} from './truncateChangeSummary.js';

describe('truncateChangeSummary', () => {
  test('returns short text unchanged', () => {
    expect(truncateChangeSummary('Less sugar')).toBe('Less sugar');
  });

  test('truncates long summaries with ellipsis', () => {
    const long = 'A'.repeat(60);
    expect(truncateChangeSummary(long)).toHaveLength(48);
    expect(truncateChangeSummary(long).endsWith('…')).toBe(true);
  });
});
