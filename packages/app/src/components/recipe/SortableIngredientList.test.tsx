import {createFormRowKey} from '@eciperay/client';
import {fireEvent, render} from '@testing-library/react-native';
import React from 'react';

import {
  createEmptyIngredientRow,
  resolveDragIndex,
  SortableIngredientList,
} from './SortableIngredientList';

describe('SortableIngredientList', () => {
  test('falls back when drag index is unavailable', () => {
    expect(resolveDragIndex((): number | undefined => undefined)).toBe(0);
    expect(resolveDragIndex(() => 2)).toBe(2);
  });

  test('reorders ingredients through the mock drag control', async () => {
    const onChange = jest.fn();
    const {getByLabelText} = await render(
      <SortableIngredientList
        ingredients={[
          {...createEmptyIngredientRow(0), key: 'i-1', name: 'Flour'},
          {...createEmptyIngredientRow(1), key: 'i-2', name: 'Salt'},
        ]}
        onChange={onChange}
        onUpdate={jest.fn()}
        onAdd={jest.fn()}
      />,
    );

    await fireEvent.press(getByLabelText('Mock reorder i-2'));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({key: 'i-2', name: 'Salt'}),
      expect.objectContaining({key: 'i-1', name: 'Flour'}),
    ]);
  });

  test('renders drag handles for ingredient rows', async () => {
    const {getByLabelText} = await render(
      <SortableIngredientList
        ingredients={[
          {
            ...createEmptyIngredientRow(0),
            key: createFormRowKey(),
            name: 'Flour',
          },
        ]}
        onChange={jest.fn()}
        onUpdate={jest.fn()}
        onAdd={jest.fn()}
      />,
    );

    expect(getByLabelText('Reorder ingredient 1')).toBeTruthy();
  });
});
