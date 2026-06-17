import {normalizeAuthEmail, normalizeAuthPassword} from './normalizeAuthInput';

describe('normalizeAuthEmail', () => {
  test('trims and lowercases email', () => {
    expect(normalizeAuthEmail('  User@Example.COM  ')).toBe('user@example.com');
  });
});

describe('normalizeAuthPassword', () => {
  test('trims password edges', () => {
    expect(normalizeAuthPassword('  secret  ')).toBe('secret');
  });
});
