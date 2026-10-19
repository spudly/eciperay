import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithProviders} from '../../__tests__/testUtils';

import {RecipeStatusPicker} from './RecipeStatusPicker';

describe('RecipeStatusPicker', () => {
  test('changes status when a chip is pressed', async () => {
    const onChange = jest.fn();
    await renderWithProviders(
      <RecipeStatusPicker
        value="idea"
        onChange={onChange}
      />,
    );
    await fireEvent.press(screen.getByText('Evolving'));
    expect(onChange).toHaveBeenCalledWith('evolving');
  });

  test('renders selected and unselected chip styles', async () => {
    await renderWithProviders(
      <RecipeStatusPicker
        value="evolving"
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByText('Evolving')).toBeTruthy();
    expect(screen.getByText('Idea')).toBeTruthy();
    expect(screen.getByText('Perfected')).toBeTruthy();
  });

  test('does not call onChange when disabled', async () => {
    const onChange = jest.fn();
    await renderWithProviders(
      <RecipeStatusPicker
        value="idea"
        onChange={onChange}
        disabled
      />,
    );
    await fireEvent.press(screen.getByText('Perfected'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
