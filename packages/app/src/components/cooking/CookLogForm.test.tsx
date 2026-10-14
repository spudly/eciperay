import React from 'react';
import {fireEvent} from '@testing-library/react-native';

import {renderWithProviders} from '../../__tests__/testUtils';

import {CookLogForm} from './CookLogForm';

describe('CookLogForm', () => {
  test('submits rating and notes', () => {
    const onSubmit = jest.fn();
    const {getByLabelText, getByText, getByPlaceholderText} =
      renderWithProviders(
        <CookLogForm
          onSubmit={onSubmit}
          onSkip={jest.fn()}
          isPending={false}
        />,
      );
    fireEvent.press(getByLabelText('Rate 4 out of 5 stars'));
    fireEvent.changeText(
      getByPlaceholderText('Notes from this cook (optional)'),
      'Great',
    );
    fireEvent.press(getByText('Save'));
    expect(onSubmit).toHaveBeenCalledWith({
      authorStarRating: 4,
      notes: 'Great',
    });
  });

  test('disables save while pending', () => {
    const onSubmit = jest.fn();
    const {getByText} = renderWithProviders(
      <CookLogForm
        onSubmit={onSubmit}
        onSkip={jest.fn()}
        isPending
      />,
    );
    fireEvent.press(getByText('Save'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('renders light variant with custom secondary label', () => {
    const onSkip = jest.fn();
    const {getByText} = renderWithProviders(
      <CookLogForm
        variant="light"
        secondaryLabel="Cancel"
        onSubmit={jest.fn()}
        onSkip={onSkip}
        isPending={false}
      />,
    );
    fireEvent.press(getByText('Cancel'));
    expect(onSkip).toHaveBeenCalled();
  });
});
