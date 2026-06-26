import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {RecipeStatusPicker} from './RecipeStatusPicker';

describe('RecipeStatusPicker', () => {
  test('changes status when a chip is pressed', () => {
    const onChange = jest.fn();
    render(
      <RecipeStatusPicker
        value="idea"
        onChange={onChange}
      />,
    );
    fireEvent.press(screen.getByText('Evolving'));
    expect(onChange).toHaveBeenCalledWith('evolving');
  });

  test('renders selected and unselected chip styles', () => {
    render(
      <RecipeStatusPicker
        value="evolving"
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByText('Evolving')).toBeTruthy();
    expect(screen.getByText('Idea')).toBeTruthy();
    expect(screen.getByText('Perfected')).toBeTruthy();
  });

  test('does not call onChange when disabled', () => {
    const onChange = jest.fn();
    render(
      <RecipeStatusPicker
        value="idea"
        onChange={onChange}
        disabled
      />,
    );
    fireEvent.press(screen.getByText('Perfected'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
