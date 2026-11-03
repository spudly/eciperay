import {act, renderHook} from '@testing-library/react';

import {useDebouncedValue} from './useDebouncedValue.js';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns the initial value immediately and follows after the delay', () => {
    const {result, rerender} = renderHook(
      ({value}) => useDebouncedValue(value, 300),
      {initialProps: {value: 'a'}},
    );
    expect(result.current).toBe('a');

    rerender({value: 'ab'});
    expect(result.current).toBe('a');
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('ab');
  });

  test('a burst of changes settles on the last value only', () => {
    const {result, rerender} = renderHook(
      ({value}) => useDebouncedValue(value, 300),
      {initialProps: {value: ''}},
    );
    rerender({value: 'p'});
    act(() => {
      jest.advanceTimersByTime(200);
    });
    rerender({value: 'pa'});
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('');
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('pa');
  });
});
