import {reorderListItem, reorderRowsByKey} from './reorderList.js';

describe('reorderListItem', () => {
  test('moves an item within the list', () => {
    expect(reorderListItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(reorderListItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  test('returns the original list for invalid moves', () => {
    const list = ['a', 'b'];
    expect(reorderListItem(list, 0, 0)).toBe(list);
    expect(reorderListItem(list, -1, 0)).toBe(list);
    expect(reorderListItem(list, 0, 5)).toBe(list);
    expect(reorderListItem(list, 5, 0)).toBe(list);
  });
});

describe('reorderRowsByKey', () => {
  test('reorders rows by stable keys', () => {
    const rows = [
      {key: 'a', name: 'Flour'},
      {key: 'b', name: 'Salt'},
    ];
    expect(reorderRowsByKey(rows, 'a', 'b')).toEqual([
      {key: 'b', name: 'Salt'},
      {key: 'a', name: 'Flour'},
    ]);
    expect(reorderRowsByKey(rows, 'a', 'a')).toBe(rows);
    expect(reorderRowsByKey(rows, 'missing', 'b')).toBe(rows);
  });
});
