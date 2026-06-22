import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {DevelopmentStatusPicker} from './DevelopmentStatusPicker';

describe('DevelopmentStatusPicker', () => {
  test('changes development status when a chip is pressed', () => {
    const onChange = jest.fn();
    render(
      <DevelopmentStatusPicker
        value="idea"
        onChange={onChange}
      />,
    );
    fireEvent.press(screen.getByText('In development'));
    expect(onChange).toHaveBeenCalledWith('in_development');
  });

  test('renders selected and unselected chip styles', () => {
    render(
      <DevelopmentStatusPicker
        value="in_development"
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByText('In development')).toBeTruthy();
    expect(screen.getByText('Idea')).toBeTruthy();
    expect(screen.getByText('Perfected')).toBeTruthy();
  });

  test('does not call onChange when disabled', () => {
    const onChange = jest.fn();
    render(
      <DevelopmentStatusPicker
        value="idea"
        onChange={onChange}
        disabled
      />,
    );
    fireEvent.press(screen.getByText('Perfected'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
