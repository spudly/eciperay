import {describe, expect, test, vi} from 'vitest';

import {
  createListDragEnd,
  dragRowOpacity,
  handleKeyedDragEnd,
} from './sortableDrag.js';

describe('sortableDrag', () => {
  test('adjusts opacity while dragging', () => {
    expect(dragRowOpacity(true)).toBe(0.6);
    expect(dragRowOpacity(false)).toBe(1);
  });

  test('reorders keyed rows when drag ends', () => {
    const onChange = vi.fn();
    const rows = [
      {key: 'a', name: 'Flour'},
      {key: 'b', name: 'Salt'},
    ];

    handleKeyedDragEnd(
      {active: {id: 'a'}, over: {id: 'b'}} as never,
      rows,
      onChange,
    );

    expect(onChange).toHaveBeenCalled();
  });

  test('ignores invalid drag end events', () => {
    const onChange = vi.fn();
    const rows = [{key: 'a', name: 'Flour'}];

    handleKeyedDragEnd(
      {active: {id: 'a'}, over: null} as never,
      rows,
      onChange,
    );
    handleKeyedDragEnd(
      {active: {id: 'missing'}, over: {id: 'a'}} as never,
      rows,
      onChange,
    );

    expect(onChange).not.toHaveBeenCalled();
  });

  test('creates list drag end handlers', () => {
    const onChange = vi.fn();
    const rows = [
      {key: 'a', name: 'Flour'},
      {key: 'b', name: 'Salt'},
    ];

    createListDragEnd(
      rows,
      onChange,
    )({active: {id: 'b'}, over: {id: 'a'}} as never);

    expect(onChange).toHaveBeenCalled();
  });
});
