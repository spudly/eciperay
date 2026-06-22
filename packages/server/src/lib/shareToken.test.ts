import {
  generateShareToken,
  hashShareToken,
  verifyShareToken,
} from './shareToken.js';

describe('shareToken', () => {
  test('generates unique tokens', () => {
    const first = generateShareToken();
    const second = generateShareToken();
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThan(20);
  });

  test('hashes tokens deterministically', () => {
    const token = 'test-token';
    expect(hashShareToken(token)).toBe(hashShareToken(token));
    expect(hashShareToken(token)).not.toBe(token);
  });

  test('verifies matching tokens', () => {
    const token = generateShareToken();
    const hash = hashShareToken(token);
    expect(verifyShareToken(token, hash)).toBe(true);
  });

  test('rejects invalid tokens and missing hashes', () => {
    const token = generateShareToken();
    const hash = hashShareToken(token);
    expect(verifyShareToken('wrong-token', hash)).toBe(false);
    expect(verifyShareToken(token, null)).toBe(false);
    expect(verifyShareToken(token, 'not-a-valid-hex')).toBe(false);
  });
});
