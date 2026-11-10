import {
  AUTH_EMAIL_ERROR_MESSAGE,
  authEmailSchema,
  validateAuthEmail,
} from './authEmail.js';

describe('validateAuthEmail', () => {
  test.each([
    ['bare username', 'stephen'],
    ['missing domain', 'a@'],
    ['missing local part', '@example.com'],
    ['empty string', ''],
    ['whitespace only', '   '],
  ])('returns the custom message for %s', (_label, email) => {
    expect(validateAuthEmail(email)).toBe('Enter a valid email address');
    expect(validateAuthEmail(email)).toBe(AUTH_EMAIL_ERROR_MESSAGE);
  });

  test('the schema itself carries the custom message, not the zod default', () => {
    const result = authEmailSchema.safeParse('stephen');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Enter a valid email address',
      );
    }
  });

  test.each([
    ['well-formed email', 'chef@example.com'],
    ['padded email is trimmed for the check', ' chef@example.com '],
    ['percent in the local part (RFC 5322 atext)', 'user%tag@example.com'],
    ['plus tag in the local part', 'user+tag@example.com'],
  ])('returns null for %s', (_label, email) => {
    expect(validateAuthEmail(email)).toBeNull();
  });
});
