import {screen} from '@testing-library/react';

import {renderWithProviders} from '../../test/testUtils.js';

import {RecipeStatusBadge} from './RecipeStatusBadge.js';

describe('RecipeStatusBadge', () => {
  test('renders the status label', async () => {
    await renderWithProviders(<RecipeStatusBadge status="evolving" />);
    expect(screen.getByText('Evolving')).toBeInTheDocument();
  });

  test('falls back to idea for unknown status', async () => {
    await renderWithProviders(<RecipeStatusBadge status={undefined} />);
    expect(screen.getByText('Idea')).toBeInTheDocument();
  });
});
