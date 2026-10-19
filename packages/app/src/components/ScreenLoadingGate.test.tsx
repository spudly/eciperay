import {act, render} from '@testing-library/react-native';
import React from 'react';
import {Text} from 'react-native';

import {ScreenLoadingGate} from './ScreenLoadingGate';

describe('ScreenLoadingGate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders children when not pending', async () => {
    const {getByText} = await render(
      <ScreenLoadingGate pending={false}>
        <Text>Ready</Text>
      </ScreenLoadingGate>,
    );

    expect(getByText('Ready')).toBeTruthy();
  });

  test('shows a spinner only after the loading delay', async () => {
    const {queryByLabelText} = await render(
      <ScreenLoadingGate pending>
        <Text>Ready</Text>
      </ScreenLoadingGate>,
    );

    expect(queryByLabelText('Loading')).toBeNull();

    await act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(queryByLabelText('Loading')).toBeTruthy();
  });

  test('renders a blank placeholder before the loading delay', async () => {
    const {queryByText, queryByLabelText} = await render(
      <ScreenLoadingGate pending>
        <Text>Ready</Text>
      </ScreenLoadingGate>,
    );

    expect(queryByText('Ready')).toBeNull();
    expect(queryByLabelText('Loading')).toBeNull();
  });
});
