import React from 'react';
import {Alert} from 'react-native';
import {render, fireEvent, waitFor} from '@testing-library/react-native';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {
  makeQueryClient,
  makeStackProps,
  renderWithProviders,
} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

import {RecipesScreen} from './RecipesScreen';

jest.mock('../lib/api');

const mockList = api.recipes.list as jest.Mock;
const mockDelete = api.recipes.delete as jest.Mock;
const mockNavigate = jest.fn();
const stackProps = makeStackProps<RecipesStackParamList, 'RecipesList'>(
  'RecipesList',
  undefined,
  {navigate: mockNavigate},
);

describe('RecipesScreen', () => {
  beforeEach(() => {
    mockList.mockResolvedValue([]);
    mockDelete.mockImplementation(async () => {});
  });

  test('renders search input', async () => {
    const {findByPlaceholderText} = render(
      renderWithProviders(<RecipesScreen {...stackProps} />),
    );
    expect(await findByPlaceholderText('Search recipes…')).toBeTruthy();
  });

  test('shows recipe thumbnail when imageUrl is present', async () => {
    mockList.mockResolvedValue([
      makeRecipeDetail({
        title: 'Cake',
        imageUrl: 'https://cdn.example/cake.jpg',
      }),
    ]);
    const {findByText, UNSAFE_getByType} = render(
      renderWithProviders(<RecipesScreen {...stackProps} />),
    );
    await findByText('Cake');
    expect(UNSAFE_getByType(require('react-native').Image)).toBeTruthy();
  });

  test('shows recipes from API with cook time', async () => {
    mockList.mockResolvedValue([
      makeRecipeDetail({title: 'Pasta', cookTimeMin: 25}),
    ]);
    const {findByText} = render(
      renderWithProviders(<RecipesScreen {...stackProps} />),
    );
    expect(await findByText(/25 min/)).toBeTruthy();
  });

  test('shows recipes without cook time', async () => {
    mockList.mockResolvedValue([
      makeRecipeDetail({title: 'Salad', cookTimeMin: null}),
    ]);
    const {findByText, queryByText} = render(
      renderWithProviders(<RecipesScreen {...stackProps} />),
    );
    expect(await findByText('Salad')).toBeTruthy();
    expect(queryByText(/min/)).toBeNull();
  });

  test('shows recipes from API', async () => {
    mockList.mockResolvedValue([
      makeRecipeDetail({title: 'Pasta', cookTimeMin: null}),
    ]);
    const {findByText} = render(
      renderWithProviders(<RecipesScreen {...stackProps} />),
    );
    expect(await findByText('Pasta')).toBeTruthy();
  });

  test('navigates to RecipeDetail on card press', async () => {
    mockList.mockResolvedValue([
      makeRecipeDetail({id: 'recipe-1', title: 'Tacos'}),
    ]);
    const {findByText} = render(
      renderWithProviders(<RecipesScreen {...stackProps} />),
    );
    fireEvent.press(await findByText('Tacos'));
    expect(mockNavigate).toHaveBeenCalledWith('RecipeDetail', {
      recipeId: 'recipe-1',
    });
  });

  test('shows loading state while fetching', () => {
    mockList.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );
    const {getByText} = render(
      renderWithProviders(<RecipesScreen {...stackProps} />),
    );
    expect(getByText('Loading…')).toBeTruthy();
  });

  test('shows empty state when no recipes match search', async () => {
    mockList.mockResolvedValue([makeRecipeDetail({title: 'Pasta'})]);
    const {findByText, getByText, getByPlaceholderText} = render(
      renderWithProviders(<RecipesScreen {...stackProps} />),
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

  test('deletes recipe after confirmation', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.[1]?.onPress?.();
    });
    mockList.mockResolvedValue([makeRecipeDetail({title: 'Soup'})]);
    const client = makeQueryClient();
    const {findByText} = render(
      renderWithProviders(<RecipesScreen {...stackProps} />, client),
    );
    fireEvent.press(await findByText('Delete'));
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
