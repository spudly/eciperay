import {render} from '@testing-library/react-native';
import React from 'react';

import {BookLoadingSpinner} from './BookLoadingSpinner';

describe('BookLoadingSpinner', () => {
  test('renders with default accessibility label', () => {
    const {getByLabelText} = render(<BookLoadingSpinner />);

    expect(getByLabelText('Loading')).toBeTruthy();
  });

  test('supports custom accessibility label', () => {
    const {getByLabelText} = render(
      <BookLoadingSpinner accessibilityLabel="Fetching recipes" />,
    );

    expect(getByLabelText('Fetching recipes')).toBeTruthy();
  });
});
