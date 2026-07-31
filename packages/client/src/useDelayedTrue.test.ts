import {act, renderHook} from '@testing-library/react';

import {DEFAULT_LOADING_DELAY_MS, useDelayedTrue} from './useDelayedTrue.js';

describe('useDelayedTrue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('stays false until the delay elapses', () => {
    const {result} = renderHook(() => useDelayedTrue(true, 100));

    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(99);
    });
    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });

  test('resets immediately when value becomes false', () => {
    const {result, rerender} = renderHook(
      ({value}: {value: boolean}) => useDelayedTrue(value, 100),
      {initialProps: {value: true}},
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe(true);

    rerender({value: false});
    expect(result.current).toBe(false);
  });

  test('uses the default delay when delayMs is omitted', () => {
    const {result} = renderHook(() => useDelayedTrue(true));

    act(() => {
      jest.advanceTimersByTime(DEFAULT_LOADING_DELAY_MS - 1);
    });
    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });
});
