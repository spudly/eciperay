import {createFormRowKey} from '@eciperay/client';
import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {renderWithProviders} from '../../__tests__/testUtils';

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
    const {getByLabelText} = await renderWithProviders(
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

  test('renders the DS row fields and folds edits into form updates', async () => {
    const onUpdate = jest.fn();
    const {getByDisplayValue} = await renderWithProviders(
      <SortableIngredientList
        ingredients={[
          {
            ...createEmptyIngredientRow(0),
            key: 'i-1',
            quantity: 2,
            unit: 'cups',
            name: 'Flour',
          },
        ]}
        onChange={jest.fn()}
        onUpdate={onUpdate}
        onAdd={jest.fn()}
      />,
    );

    for (const value of ['2', 'cups', 'Flour']) {
      expect(getByDisplayValue(value)).toBeTruthy();
    }

    await fireEvent.changeText(getByDisplayValue('Flour'), 'Rice flour');
    expect(onUpdate).toHaveBeenCalledWith(0, 'name', 'Rice flour');

    // An emptied quantity folds to null, preserving the retired host
    // row's fold — the form state never carries "".
    await fireEvent.changeText(getByDisplayValue('2'), '');
    expect(onUpdate).toHaveBeenCalledWith(0, 'quantity', null);
  });

  test('removes a row by key through the DS row remove action', async () => {
    const onChange = jest.fn();
    const {getByLabelText} = await renderWithProviders(
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

    await fireEvent.press(getByLabelText('Remove ingredient 1'));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({key: 'i-2', name: 'Salt'}),
    ]);
  });

  test('renders drag handles for ingredient rows', async () => {
    const {getByLabelText} = await renderWithProviders(
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
