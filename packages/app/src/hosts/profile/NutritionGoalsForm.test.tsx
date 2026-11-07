import React from 'react';
import {fireEvent} from '@testing-library/react-native';

import {renderWithProviders} from '../../__tests__/testUtils';

import {NutritionGoalsForm} from './NutritionGoalsForm';

const goals = {
  calories: 2000,
  proteinG: 120,
  carbsG: null,
  fatG: null,
  satietyScore: null,
};

describe('NutritionGoalsForm', () => {
  test('renders the goal fields and reports a patched goal on edit', async () => {
    const onChange = jest.fn();
    const {getByText, getByDisplayValue} = await renderWithProviders(
      <NutritionGoalsForm
        goals={goals}
        onChange={onChange}
        onSave={jest.fn()}
      />,
    );
    expect(getByText('Daily nutrition goals')).toBeTruthy();
    expect(getByText('Protein (g)')).toBeTruthy();

    await fireEvent.changeText(getByDisplayValue('2000'), '2100');
    expect(onChange).toHaveBeenCalledWith({...goals, calories: 2100});
  });

  test('preserves decimal text while typing and reports the parsed value', async () => {
    const onChange = jest.fn();
    const {getByDisplayValue} = await renderWithProviders(
      <NutritionGoalsForm
        goals={goals}
        onChange={onChange}
        onSave={jest.fn()}
      />,
    );

    await fireEvent.changeText(getByDisplayValue('2000'), '1.5');
    expect(getByDisplayValue('1.5')).toBeTruthy();
    expect(onChange).toHaveBeenCalledWith({...goals, calories: 1.5});
  });

  test('invokes onSave from the save button and shows errors', async () => {
    const onSave = jest.fn();
    const {getByText} = await renderWithProviders(
      <NutritionGoalsForm
        goals={goals}
        onChange={jest.fn()}
        onSave={onSave}
        error="Could not save goals."
      />,
    );
    expect(getByText('Could not save goals.')).toBeTruthy();

    await fireEvent.press(getByText('Save goals'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
