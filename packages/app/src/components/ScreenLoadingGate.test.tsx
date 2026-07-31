import {act, render} from '@testing-library/react-native';
import React from 'react';
import {ActivityIndicator, Text} from 'react-native';

import {ScreenLoadingGate} from './ScreenLoadingGate';

describe('ScreenLoadingGate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders children when not pending', () => {
    const {getByText} = render(
      <ScreenLoadingGate pending={false}>
        <Text>Ready</Text>
      </ScreenLoadingGate>,
    );

    expect(getByText('Ready')).toBeTruthy();
  });

  test('shows a spinner only after the loading delay', () => {
    const {UNSAFE_queryByType} = render(
      <ScreenLoadingGate pending>
        <Text>Ready</Text>
      </ScreenLoadingGate>,
    );

    expect(UNSAFE_queryByType(ActivityIndicator)).toBeNull();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(UNSAFE_queryByType(ActivityIndicator)).toBeTruthy();
  });

  test('renders a blank placeholder before the loading delay', () => {
    const {queryByText, UNSAFE_queryByType} = render(
      <ScreenLoadingGate pending>
        <Text>Ready</Text>
      </ScreenLoadingGate>,
    );

    expect(queryByText('Ready')).toBeNull();
    expect(UNSAFE_queryByType(ActivityIndicator)).toBeNull();
  });
});
