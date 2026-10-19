import React from 'react';
import {fireEvent} from '@testing-library/react-native';

import {renderWithProviders} from '../../__tests__/testUtils';

import {CookLogForm} from './CookLogForm';

describe('CookLogForm', () => {
  test('submits rating and notes', async () => {
    const onSubmit = jest.fn();
    const {getByLabelText, getByText, getByPlaceholderText} =
      await renderWithProviders(
        <CookLogForm
          onSubmit={onSubmit}
          onSkip={jest.fn()}
          isPending={false}
        />,
      );
    await fireEvent.press(getByLabelText('Rate 4 out of 5 stars'));
    await fireEvent.changeText(
      getByPlaceholderText('Notes from this cook (optional)'),
      'Great',
    );
    await fireEvent.press(getByText('Save'));
    expect(onSubmit).toHaveBeenCalledWith({
      authorStarRating: 4,
      notes: 'Great',
    });
  });

  test('disables save while pending', async () => {
    const onSubmit = jest.fn();
    const {getByText} = await renderWithProviders(
      <CookLogForm
        onSubmit={onSubmit}
        onSkip={jest.fn()}
        isPending
      />,
    );
    await fireEvent.press(getByText('Save'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('renders light variant with custom secondary label', async () => {
    const onSkip = jest.fn();
    const {getByText} = await renderWithProviders(
      <CookLogForm
        variant="light"
        secondaryLabel="Cancel"
        onSubmit={jest.fn()}
        onSkip={onSkip}
        isPending={false}
      />,
    );
    await fireEvent.press(getByText('Cancel'));
    expect(onSkip).toHaveBeenCalled();
  });
});
