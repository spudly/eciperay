import {resolveDevelopmentStatus} from './resolveDevelopmentStatus.js';

describe('resolveDevelopmentStatus', () => {
  test('defaults to idea when omitted', () => {
    expect(resolveDevelopmentStatus({})).toBe('idea');
  });

  test('returns the provided development status', () => {
    expect(resolveDevelopmentStatus({developmentStatus: 'perfected'})).toBe(
      'perfected',
    );
  });
});
