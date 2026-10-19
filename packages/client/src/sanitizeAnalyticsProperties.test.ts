import {sanitizeAnalyticsProperties} from './sanitizeAnalyticsProperties.js';

describe('sanitizeAnalyticsProperties', () => {
  test('redacts sensitive property keys', () => {
    expect(
      sanitizeAnalyticsProperties({
        route: '/recipes',
        password: 'hunter2',
        access_token: 'abc123',
        apiKey: 'secret-key',
      }),
    ).toEqual({
      route: '/recipes',
      password: '[redacted]',
      access_token: '[redacted]',
      apiKey: '[redacted]',
    });
  });

  test('truncates long string values', () => {
    const longValue = 'x'.repeat(2100);
    const sanitized = sanitizeAnalyticsProperties({message: longValue});
    expect(sanitized?.['message']).toHaveLength(2001);
    expect(String(sanitized?.['message']).endsWith('…')).toBe(true);
  });

  test('keeps feedback-length messages intact', () => {
    const message = 'x'.repeat(2000);
    const sanitized = sanitizeAnalyticsProperties({message});
    expect(sanitized?.['message']).toBe(message);
  });

  test('passes through non-sensitive properties', () => {
    expect(sanitizeAnalyticsProperties({route: '/home'})).toEqual({
      route: '/home',
    });
  });

  test('preserves PostHog project token key', () => {
    expect(
      sanitizeAnalyticsProperties({
        token: 'phc_project_key',
        access_token: 'user-secret',
      }),
    ).toEqual({token: 'phc_project_key', access_token: '[redacted]'});
  });
});
