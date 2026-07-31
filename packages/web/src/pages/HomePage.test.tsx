import {recordRecipeView} from '@eciperay/client';
import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {recipeViewHistoryStorage} from '../lib/recipeViewHistoryStorage.js';
import {renderWithProviders} from '../test/testUtils.js';

import {HomePage} from './HomePage.js';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {...actual, useNavigate: () => mockNavigate};
});

describe('HomePage', () => {
  beforeEach(async () => {
    localStorage.clear();
    mockNavigate.mockReset();
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

  test('navigates from home actions and recently viewed recipes', async () => {
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-uuid-1');
    await renderWithProviders(<HomePage />);
    await userEvent.click(screen.getByText('Shared with me'));
    expect(mockNavigate).toHaveBeenCalledWith('/shared-with-me');
    await userEvent.click(screen.getByText('Browse Recipes'));
    expect(mockNavigate).toHaveBeenCalledWith('/recipes');
    await userEvent.click(screen.getByText('Add Recipe'));
    expect(mockNavigate).toHaveBeenCalledWith('/add');
    await userEvent.click(screen.getByRole('button', {name: /Test Recipe/i}));
    expect(mockNavigate).toHaveBeenCalledWith('/recipes/recipe-uuid-1');
  });
});
