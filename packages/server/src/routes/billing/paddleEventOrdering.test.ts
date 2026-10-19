import {shouldApplyEvent} from './paddleEventOrdering.js';
import type {PaddleEvent} from './paddleEvents.js';

const makeEvent = (occurred_at?: string): PaddleEvent => ({
  event_id: 'evt_test',
  event_type: 'subscription.updated',
  ...(occurred_at ? {occurred_at} : {}),
  data: {},
});

describe('paddleEventOrdering', () => {
  test('applies an event newer than the last applied timestamp', () => {
    const {apply, eventAt} = shouldApplyEvent(
      makeEvent('2026-10-13T16:00:00.000Z'),
      '2026-10-13T15:00:00.000Z',
    );
    expect(apply).toBe(true);
    expect(eventAt).toBe('2026-10-13T16:00:00.000Z');
  });

  test('ignores an event older than the last applied timestamp', () => {
    const {apply} = shouldApplyEvent(
      makeEvent('2026-10-13T15:00:00.000Z'),
      '2026-10-13T16:00:00.000Z',
    );
    expect(apply).toBe(false);
  });

  test('ignores an event with the same timestamp as the last applied', () => {
    const {apply} = shouldApplyEvent(
      makeEvent('2026-10-13T16:00:00.000Z'),
      '2026-10-13T16:00:00.000Z',
    );
    expect(apply).toBe(false);
  });

  test('applies when no timestamp was previously stored', () => {
    const {apply, eventAt} = shouldApplyEvent(
      makeEvent('2026-10-13T16:00:00.000Z'),
      null,
    );
    expect(apply).toBe(true);
    expect(eventAt).toBe('2026-10-13T16:00:00.000Z');
  });

  test('applies when the event has no occurred_at (fail open)', () => {
    const {apply, eventAt} = shouldApplyEvent(
      makeEvent(),
      '2026-10-13T16:00:00.000Z',
    );
    expect(apply).toBe(true);
    expect(eventAt).toBeNull();
  });

  test('applies when occurred_at is unparseable (fail open)', () => {
    const {apply, eventAt} = shouldApplyEvent(
      makeEvent('not-a-date'),
      '2026-10-13T16:00:00.000Z',
    );
    expect(apply).toBe(true);
    expect(eventAt).toBeNull();
  });

  test('normalizes a native Date stored timestamp (pg timestamptz)', () => {
    // pg returns timestamptz as Date objects at runtime; comparing the
    // ISO event string against a Date with > is always false, which
    // used to reject every event after the first.
    expect(
      shouldApplyEvent(
        makeEvent('2026-10-13T16:00:00.000Z'),
        new Date('2026-10-13T15:00:00.000Z'),
      ).apply,
    ).toBe(true);
    expect(
      shouldApplyEvent(
        makeEvent('2026-10-13T16:00:00.000Z'),
        new Date('2026-10-13T17:00:00.000Z'),
      ).apply,
    ).toBe(false);
  });
});
