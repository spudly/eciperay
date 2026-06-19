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
    const longValue = 'x'.repeat(600);
    const sanitized = sanitizeAnalyticsProperties({message: longValue});
    expect(sanitized?.['message']).toHaveLength(501);
    expect(String(sanitized?.['message']).endsWith('…')).toBe(true);
  });

  test('passes through non-sensitive properties', () => {
    expect(sanitizeAnalyticsProperties({route: '/home'})).toEqual({
      route: '/home',
    });
  });
});
