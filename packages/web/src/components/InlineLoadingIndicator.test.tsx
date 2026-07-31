import {act, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {InlineLoadingIndicator} from './InlineLoadingIndicator.js';

describe('InlineLoadingIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders nothing until the delay elapses', () => {
    render(<InlineLoadingIndicator loading />);

    expect(screen.queryByRole('status')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('renders nothing when loading is false', () => {
    render(<InlineLoadingIndicator loading={false} />);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.queryByRole('status')).toBeNull();
  });
});
