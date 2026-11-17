import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {renderWithProviders} from '../../__tests__/testUtils';

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

  test('renders the DS row body and folds edits into form updates', async () => {
    const onUpdate = jest.fn();
    const {getByDisplayValue} = await renderWithProviders(
      <SortableInstructionList
        instructions={[
          {...createEmptyInstructionRow(1), key: 'ins-1', body: 'Prep'},
        ]}
        onChange={jest.fn()}
        onUpdate={onUpdate}
        onAdd={jest.fn()}
      />,
    );

    expect(getByDisplayValue('Prep')).toBeTruthy();

    await fireEvent.changeText(getByDisplayValue('Prep'), 'Prep well');
    expect(onUpdate).toHaveBeenCalledWith(0, 'Prep well');
  });

  test('reorders instructions through the mock drag control', async () => {
    const onChange = jest.fn();
    const {getByLabelText} = await renderWithProviders(
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

  test('removes a row by key through the DS row remove action', async () => {
    const onChange = jest.fn();
    const {getByLabelText} = await renderWithProviders(
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

    await fireEvent.press(getByLabelText('Remove step 1'));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({key: 'ins-2', body: 'Cook'}),
    ]);
  });
});
