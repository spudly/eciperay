import {sanitizePostHogEventProperties} from './sanitizeAnalyticsProperties.js';

describe('sanitizePostHogEventProperties', () => {
  test('returns undefined when properties are missing', () => {
    expect(sanitizePostHogEventProperties(undefined)).toBeUndefined();
  });

  test('preserves PostHog system properties while scrubbing custom ones', () => {
    expect(
      sanitizePostHogEventProperties({
        token: 'phc_project_key',
        distinct_id: 'user-1',
        $lib: 'web',
        route: '/home',
        password: 'secret',
      }),
    ).toEqual({
      token: 'phc_project_key',
      distinct_id: 'user-1',
      $lib: 'web',
      route: '/home',
      password: '[redacted]',
    });
  });
});
