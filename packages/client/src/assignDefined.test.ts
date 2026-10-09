import {assignDefined} from './assignDefined.js';

describe('assignDefined', () => {
  test('copies defined values and skips undefined', () => {
    const target = {a: 1, b: 2, c: 3};
    expect(assignDefined(target, {a: 10, b: undefined, c: 30})).toBe(target);
    expect(target).toEqual({a: 10, b: 2, c: 30});
  });
});
