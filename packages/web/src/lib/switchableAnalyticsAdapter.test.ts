import {createNoopAnalyticsAdapter} from '@eciperay/client';
import {describe, expect, test} from 'vitest';

import {createSwitchableAnalyticsAdapter} from './switchableAnalyticsAdapter.js';

describe('createSwitchableAnalyticsAdapter', () => {
  test('delegates calls to the active adapter', () => {
    const capture = vi.fn();
    const identify = vi.fn();
    const reset = vi.fn();
    const {adapter, setAdapter} = createSwitchableAnalyticsAdapter({
      capture,
      identify,
      reset,
    });

    adapter.capture('event', {recipe_id: 'r1'});
    adapter.identify('user-1', {email: 'chef@example.com'});
    adapter.reset();
    expect(capture).toHaveBeenCalled();
    expect(identify).toHaveBeenCalled();
    expect(reset).toHaveBeenCalled();

    const nextCapture = vi.fn();
    setAdapter(createNoopAnalyticsAdapter());
    adapter.capture('event', {recipe_id: 'r2'});
    expect(nextCapture).not.toHaveBeenCalled();
  });
});
