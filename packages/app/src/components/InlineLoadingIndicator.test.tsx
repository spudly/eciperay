import {act, render} from '@testing-library/react-native';
import React from 'react';
import {ActivityIndicator} from 'react-native';

import {InlineLoadingIndicator} from './InlineLoadingIndicator';

describe('InlineLoadingIndicator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders nothing until the delay elapses', () => {
    const {UNSAFE_queryByType} = render(<InlineLoadingIndicator loading />);

    expect(UNSAFE_queryByType(ActivityIndicator)).toBeNull();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(UNSAFE_queryByType(ActivityIndicator)).toBeTruthy();
  });

  test('renders nothing when loading is false', () => {
    const {UNSAFE_queryByType} = render(
      <InlineLoadingIndicator loading={false} />,
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(UNSAFE_queryByType(ActivityIndicator)).toBeNull();
  });
});
