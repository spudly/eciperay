import {deriveVersionRole} from './deriveVersionRole.js';

const active = {id: 'active-id', versionNumber: 2};

describe('deriveVersionRole', () => {
  test('returns active for the active version', () => {
    expect(deriveVersionRole(active, active, 1)).toBe('active');
  });

  test('returns archived for lower version numbers', () => {
    expect(deriveVersionRole({id: 'v1', versionNumber: 1}, active, 3)).toBe(
      'archived',
    );
  });

  test('returns draft for higher versions without cook logs', () => {
    expect(deriveVersionRole({id: 'v3', versionNumber: 3}, active, 0)).toBe(
      'draft',
    );
  });

  test('returns candidate for higher versions with cook logs', () => {
    expect(deriveVersionRole({id: 'v3', versionNumber: 3}, active, 2)).toBe(
      'candidate',
    );
  });
});
