import {render, screen} from '@testing-library/react';
import {describe, expect, test} from 'vitest';

import {BookLoadingSpinner} from './BookLoadingSpinner.js';

describe('BookLoadingSpinner', () => {
  test('renders with loading status role and default label', () => {
    render(<BookLoadingSpinner />);

    expect(screen.getByRole('status', {name: 'Loading'})).toBeInTheDocument();
  });

  test('supports custom accessibility label', () => {
    render(<BookLoadingSpinner accessibilityLabel="Fetching recipes" />);

    expect(
      screen.getByRole('status', {name: 'Fetching recipes'}),
    ).toBeInTheDocument();
  });
});
