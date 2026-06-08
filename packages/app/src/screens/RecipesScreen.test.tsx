import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import {apiFetch} from '../lib/api';

import {RecipesScreen} from './RecipesScreen';

jest.mock('../lib/api', () => ({apiFetch: jest.fn()}));

const mockApiFetch = apiFetch as jest.Mock;
const mockNavigate = jest.fn();
const nav = {navigate: mockNavigate};

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
      },
    },
  });

let queryClient: QueryClient;

const wrap = (component: React.ReactElement) => (
  <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
);

describe('RecipesScreen', () => {
  beforeEach(() => {
    queryClient = makeQueryClient();
  });

  test('renders search input', async () => {
    mockApiFetch.mockResolvedValue([]);
    const {findByPlaceholderText} = render(
      wrap(<RecipesScreen navigation={nav} />),
    );
    expect(await findByPlaceholderText('Search recipes…')).toBeTruthy();
  });

  test('shows recipes from API', async () => {
    mockApiFetch.mockResolvedValue([
      {id: '1', title: 'Pasta', servings: 4, cookTimeMin: null},
    ]);
    const {findByText} = render(wrap(<RecipesScreen navigation={nav} />));
    expect(await findByText('Pasta')).toBeTruthy();
  });

  test('navigates to RecipeDetail on card press', async () => {
    mockApiFetch.mockResolvedValue([
      {id: 'recipe-1', title: 'Tacos', servings: 2, cookTimeMin: 20},
    ]);
    const {findByText} = render(wrap(<RecipesScreen navigation={nav} />));
    const card = await findByText('Tacos');
    fireEvent.press(card);
    expect(mockNavigate).toHaveBeenCalledWith('RecipeDetail', {
      recipeId: 'recipe-1',
    });
  });

  test('shows loading state while fetching', () => {
    mockApiFetch.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );
    const {getByText} = render(wrap(<RecipesScreen navigation={nav} />));
    expect(getByText('Loading…')).toBeTruthy();
  });

  test('shows empty state when no recipes match search', async () => {
    mockApiFetch.mockResolvedValue([
      {id: '1', title: 'Pasta', servings: 4, cookTimeMin: null},
    ]);
    const {findByText, getByText, getByPlaceholderText} = render(
      wrap(<RecipesScreen navigation={nav} />),
    );
    await findByText('Pasta');
    fireEvent.changeText(
      getByPlaceholderText('Search recipes…'),
      'Nonexistent Recipe',
    );
    await waitFor(() => {
      expect(getByText('No recipes found.')).toBeTruthy();
    });
  });
});
