import React from 'react';
import {fireEvent} from '@testing-library/react-native';

import {renderWithProviders} from '../__tests__/testUtils';

import {StarRatingInput} from './StarRatingInput';

describe('StarRatingInput', () => {
  test('reports the pressed star and clears on a repeat press', async () => {
    const onChange = jest.fn();
    const {getByLabelText, rerender} = await renderWithProviders(
      <StarRatingInput
        value={null}
        onChange={onChange}
      />,
    );

    await fireEvent.press(getByLabelText('Rate 4 out of 5 stars'));
    expect(onChange).toHaveBeenCalledWith(4);

    await rerender(
      <StarRatingInput
        value={4}
        onChange={onChange}
      />,
    );
    await fireEvent.press(getByLabelText('Rate 4 out of 5 stars'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  test('marks filled stars as checked', async () => {
    const {getByLabelText} = await renderWithProviders(
      <StarRatingInput
        value={3}
        onChange={jest.fn()}
      />,
    );
    expect(
      getByLabelText('Rate 3 out of 5 stars').props.accessibilityState,
    ).toMatchObject({checked: true});
    expect(
      getByLabelText('Rate 4 out of 5 stars').props.accessibilityState,
    ).toMatchObject({checked: false});
  });

  test('does not report changes while disabled', async () => {
    const onChange = jest.fn();
    const {getByLabelText} = await renderWithProviders(
      <StarRatingInput
        value={2}
        onChange={onChange}
        disabled
      />,
    );
    await fireEvent.press(getByLabelText('Rate 5 out of 5 stars'));
    expect(onChange).not.toHaveBeenCalled();
  });

  test('renders a static display when readOnly', async () => {
    const {getByLabelText, queryByLabelText} = await renderWithProviders(
      <StarRatingInput
        value={3}
        readOnly
      />,
    );
    expect(getByLabelText('Rated 3 out of 5 stars')).toBeTruthy();
    expect(queryByLabelText('Rate 3 out of 5 stars')).toBeNull();
  });
});
