import {recordRecipeView} from '@eciperay/client';
import {screen} from '@testing-library/react';

import {recipeViewHistoryStorage} from '../lib/recipeViewHistoryStorage.js';
import {renderWithProviders} from '../test/testUtils.js';

import {HomePage} from './HomePage.js';

describe('HomePage', () => {
  beforeEach(async () => {
    localStorage.clear();
  });

  test('renders welcome, actions, and recently viewed section', async () => {
    await renderWithProviders(<HomePage />);
    expect(screen.getByText('Welcome to Eciperay')).toBeInTheDocument();
    expect(screen.getByText('Browse Recipes')).toBeInTheDocument();
    expect(screen.getByText('Recently viewed')).toBeInTheDocument();
    expect(
      screen.getByText('Recipes you view will appear here.'),
    ).toBeInTheDocument();
  });

  test('shows recently viewed recipes from local history', async () => {
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-uuid-1');
    await renderWithProviders(<HomePage />);
    expect(await screen.findByText('Test Recipe')).toBeInTheDocument();
  });
});
