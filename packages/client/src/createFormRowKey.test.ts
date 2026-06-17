import {createFormRowKey} from './createFormRowKey.js';

describe('createFormRowKey', () => {
  test('reuses an existing id when provided', () => {
    expect(createFormRowKey('ingredient-1')).toBe('ingredient-1');
  });

  test('generates a unique key when no id is provided', () => {
    const first = createFormRowKey();
    const second = createFormRowKey();
    expect(first).not.toBe(second);
  });

  test('falls back when crypto.randomUUID is unavailable', () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: undefined,
    });
    try {
      expect(createFormRowKey()).toMatch(/^form-row-\d+$/);
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: originalCrypto,
      });
    }
  });
});
