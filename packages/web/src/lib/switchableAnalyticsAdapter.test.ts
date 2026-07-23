import {createNoopAnalyticsAdapter} from '@eciperay/client';
import {describe, expect, test} from 'vitest';

import {createSwitchableAnalyticsAdapter} from './switchableAnalyticsAdapter.js';

describe('createSwitchableAnalyticsAdapter', () => {
  test('delegates calls to the active adapter', () => {
    const capture = vi.fn();
    const identify = vi.fn();
    const reset = vi.fn();
    const ensureSessionRecordingForFeedback = vi.fn();
    const getSessionId = vi.fn();
    const getSessionReplayUrl = vi.fn();
    const {adapter, setAdapter} = createSwitchableAnalyticsAdapter({
      capture,
      identify,
      reset,
      ensureSessionRecordingForFeedback,
      getSessionId,
      getSessionReplayUrl,
    });

    adapter.capture('event', {recipe_id: 'r1'});
    adapter.identify('user-1', {email: 'chef@example.com'});
    adapter.reset();
    void adapter.ensureSessionRecordingForFeedback?.();
    adapter.getSessionId?.();
    adapter.getSessionReplayUrl?.();
    expect(capture).toHaveBeenCalled();
    expect(identify).toHaveBeenCalled();
    expect(reset).toHaveBeenCalled();
    expect(ensureSessionRecordingForFeedback).toHaveBeenCalled();
    expect(getSessionId).toHaveBeenCalled();
    expect(getSessionReplayUrl).toHaveBeenCalled();

    const nextCapture = vi.fn();
    setAdapter(createNoopAnalyticsAdapter());
    adapter.capture('event', {recipe_id: 'r2'});
    expect(nextCapture).not.toHaveBeenCalled();
  });
});
