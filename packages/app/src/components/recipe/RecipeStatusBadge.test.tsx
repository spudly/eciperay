import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {RecipeStatusBadge} from './RecipeStatusBadge';

describe('RecipeStatusBadge', () => {
  test.each([
    ['idea', 'Idea'],
    ['evolving', 'Evolving'],
    ['perfected', 'Perfected'],
    ['abandoned', 'Abandoned'],
  ] as const)('renders %s label', (status, label) => {
    render(<RecipeStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeTruthy();
  });
});
