import {
  readShoppingListCheckedKeys,
  shoppingListCheckedStorageKey,
  writeShoppingListCheckedKeys,
} from './shoppingListChecked.js';

describe('shoppingListChecked', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('round-trips checked keys for a user and plan', () => {
    expect(readShoppingListCheckedKeys('user-1', 'plan-1')).toEqual(new Set());
    writeShoppingListCheckedKeys(
      'user-1',
      'plan-1',
      new Set(['flour', 'eggs']),
    );
    expect(
      localStorage.getItem(shoppingListCheckedStorageKey('user-1', 'plan-1')),
    ).toBe(JSON.stringify(['flour', 'eggs']));
    expect(readShoppingListCheckedKeys('user-1', 'plan-1')).toEqual(
      new Set(['flour', 'eggs']),
    );
  });

  test('keys are scoped per user and per plan', () => {
    writeShoppingListCheckedKeys('user-1', 'plan-1', new Set(['flour']));
    expect(readShoppingListCheckedKeys('user-2', 'plan-1')).toEqual(new Set());
    expect(readShoppingListCheckedKeys('user-1', 'plan-2')).toEqual(new Set());
  });

  test('writing an empty set removes the stored entry', () => {
    writeShoppingListCheckedKeys('user-1', 'plan-1', new Set(['flour']));
    writeShoppingListCheckedKeys('user-1', 'plan-1', new Set());
    expect(
      localStorage.getItem(shoppingListCheckedStorageKey('user-1', 'plan-1')),
    ).toBeNull();
    expect(readShoppingListCheckedKeys('user-1', 'plan-1')).toEqual(new Set());
  });

  test('reports whether the write persisted', () => {
    expect(
      writeShoppingListCheckedKeys('user-1', 'plan-1', new Set(['flour'])),
    ).toBe(true);
    const setItem = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota exceeded');
      });
    try {
      expect(
        writeShoppingListCheckedKeys('user-1', 'plan-1', new Set(['eggs'])),
      ).toBe(false);
      // The failed write leaves the previously stored set untouched.
      expect(readShoppingListCheckedKeys('user-1', 'plan-1')).toEqual(
        new Set(['flour']),
      );
    } finally {
      setItem.mockRestore();
    }
  });

  test('ignores corrupt or non-string stored values', () => {
    const key = shoppingListCheckedStorageKey('user-1', 'plan-1');
    localStorage.setItem(key, 'not json');
    expect(readShoppingListCheckedKeys('user-1', 'plan-1')).toEqual(new Set());
    localStorage.setItem(key, JSON.stringify({flour: true}));
    expect(readShoppingListCheckedKeys('user-1', 'plan-1')).toEqual(new Set());
    localStorage.setItem(key, JSON.stringify(['flour', 42, null]));
    expect(readShoppingListCheckedKeys('user-1', 'plan-1')).toEqual(
      new Set(['flour']),
    );
  });
});
