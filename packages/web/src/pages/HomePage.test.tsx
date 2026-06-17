import {screen} from '@testing-library/react';

import {renderWithProviders} from '../test/testUtils.js';

import {HomePage} from './HomePage.js';

describe('HomePage', () => {
  test('renders welcome and links', async () => {
    await renderWithProviders(<HomePage />);
    expect(screen.getByText('Welcome to Eciperay')).toBeInTheDocument();
    expect(screen.getByText('Browse Recipes')).toBeInTheDocument();
  });
});
