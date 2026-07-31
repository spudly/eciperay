import {act, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {ScreenLoadingGate} from './ScreenLoadingGate.js';

describe('ScreenLoadingGate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders children when not pending', () => {
    render(
      <ScreenLoadingGate pending={false}>
        <div>Ready</div>
      </ScreenLoadingGate>,
    );

    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  test('shows a spinner only after the loading delay', () => {
    render(
      <ScreenLoadingGate pending>
        <div>Ready</div>
      </ScreenLoadingGate>,
    );

    expect(screen.queryByRole('status')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('renders a blank placeholder before the loading delay', () => {
    render(
      <ScreenLoadingGate pending>
        <div>Ready</div>
      </ScreenLoadingGate>,
    );

    expect(screen.queryByText('Ready')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
