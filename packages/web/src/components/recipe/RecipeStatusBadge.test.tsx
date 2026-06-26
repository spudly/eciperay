import {screen} from '@testing-library/react';

import {renderWithProviders} from '../../test/testUtils.js';

import {RecipeStatusBadge} from './RecipeStatusBadge.js';

describe('RecipeStatusBadge', () => {
  test('renders the status label', async () => {
    await renderWithProviders(<RecipeStatusBadge status="evolving" />);
    expect(screen.getByText('Evolving')).toBeInTheDocument();
  });
});
