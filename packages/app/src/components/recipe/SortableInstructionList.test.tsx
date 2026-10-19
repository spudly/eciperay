import {fireEvent, render} from '@testing-library/react-native';
import React from 'react';

import {
  createEmptyInstructionRow,
  resolveDragIndex,
  SortableInstructionList,
} from './SortableInstructionList';

describe('SortableInstructionList', () => {
  test('falls back when drag index is unavailable', () => {
    expect(resolveDragIndex((): number | undefined => undefined)).toBe(0);
    expect(resolveDragIndex(() => 1)).toBe(1);
  });

  test('reorders instructions through the mock drag control', async () => {
    const onChange = jest.fn();
    const {getByLabelText} = await render(
      <SortableInstructionList
        instructions={[
          {...createEmptyInstructionRow(1), key: 'ins-1', body: 'Prep'},
          {...createEmptyInstructionRow(2), key: 'ins-2', body: 'Cook'},
        ]}
        onChange={onChange}
        onUpdate={jest.fn()}
        onAdd={jest.fn()}
      />,
    );

    await fireEvent.press(getByLabelText('Mock reorder ins-2'));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({key: 'ins-2', body: 'Cook'}),
      expect.objectContaining({key: 'ins-1', body: 'Prep'}),
    ]);
  });
});
