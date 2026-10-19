import {act, render} from '@testing-library/react-native';
import React from 'react';

import {InlineLoadingIndicator} from './InlineLoadingIndicator';

describe('InlineLoadingIndicator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders nothing until the delay elapses', async () => {
    const {queryByLabelText} = await render(<InlineLoadingIndicator loading />);

    expect(queryByLabelText('Loading')).toBeNull();

    await act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(queryByLabelText('Loading')).toBeTruthy();
  });

  test('renders nothing when loading is false', async () => {
    const {queryByLabelText} = await render(
      <InlineLoadingIndicator loading={false} />,
    );

    await act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(queryByLabelText('Loading')).toBeNull();
  });
});
