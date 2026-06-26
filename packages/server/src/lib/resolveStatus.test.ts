import {resolveStatus} from './resolveStatus.js';

describe('resolveStatus', () => {
  test('defaults to idea when omitted', () => {
    expect(resolveStatus({})).toBe('idea');
  });

  test('returns the provided status', () => {
    expect(resolveStatus({status: 'perfected'})).toBe('perfected');
  });
});
