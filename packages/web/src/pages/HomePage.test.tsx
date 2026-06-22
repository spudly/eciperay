import {recordRecipeView} from '@eciperay/client';
import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

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
    expect(screen.getByText('Shared with me')).toBeInTheDocument();
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

  test('deletes a recently viewed recipe on confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-uuid-1');
    await renderWithProviders(<HomePage />);
    await screen.findByText('Test Recipe');
    await userEvent.click(screen.getByText('Delete'));
    await waitFor(() => {
      expect(screen.queryByText('Test Recipe')).not.toBeInTheDocument();
    });
    expect(
      screen.getByText('Recipes you view will appear here.'),
    ).toBeInTheDocument();
  });
});
