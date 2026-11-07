import React from 'react';
import {fireEvent} from '@testing-library/react-native';

import {renderWithProviders} from '../__tests__/testUtils';

import {CookLogForm} from './CookLogForm';

describe('CookLogForm', () => {
  test('submits the pressed rating with empty notes as null', async () => {
    const onSubmit = jest.fn();
    const {getByLabelText, getByText} = await renderWithProviders(
      <CookLogForm
        onSubmit={onSubmit}
        onSkip={jest.fn()}
        isPending={false}
      />,
    );
    expect(getByText('How did it go?')).toBeTruthy();

    await fireEvent.press(getByLabelText('Rate 5 out of 5 stars'));
    await fireEvent.press(getByLabelText('Save'));
    expect(onSubmit).toHaveBeenCalledWith({rating: 5, notes: null});
  });

  test('trims notes on submit and reports skips', async () => {
    const onSubmit = jest.fn();
    const onSkip = jest.fn();
    const {getByLabelText, getByPlaceholderText, getByText} =
      await renderWithProviders(
        <CookLogForm
          onSubmit={onSubmit}
          onSkip={onSkip}
          isPending={false}
        />,
      );
    await fireEvent.changeText(
      getByPlaceholderText('Notes (optional)'),
      '  Great texture  ',
    );
    await fireEvent.press(getByLabelText('Save'));
    expect(onSubmit).toHaveBeenCalledWith({
      rating: null,
      notes: 'Great texture',
    });

    await fireEvent.press(getByText('Skip'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
