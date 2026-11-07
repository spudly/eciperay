import React from 'react';
import {fireEvent} from '@testing-library/react-native';

import {renderWithProviders} from '../__tests__/testUtils';

import {ThumbnailListCard} from './ThumbnailListCard';

describe('ThumbnailListCard', () => {
  test('renders title and subtitle and reports presses', async () => {
    const onPress = jest.fn();
    const {getByText} = await renderWithProviders(
      <ThumbnailListCard
        title="Tomato Soup"
        subtitle="Ready in 30 minutes"
        onPress={onPress}
      />,
    );
    expect(getByText('Tomato Soup')).toBeTruthy();
    expect(getByText('Ready in 30 minutes')).toBeTruthy();

    await fireEvent.press(getByText('Tomato Soup'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
