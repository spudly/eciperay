import React from 'react';
import {Alert, FlatList} from 'react-native';
import {fireEvent, waitFor, act} from '@testing-library/react-native';
import {RECIPE_LIST_PAGE_SIZE} from '@recipoo/client';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {
  flushQueryClient,
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
    const {findByPlaceholderText} = renderWithProviders(
      <RecipesScreen {...stackProps} />,
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
    const {findByText, UNSAFE_getByType} = renderWithProviders(
      <RecipesScreen {...stackProps} />,
    );
    await findByText('Cake');
    expect(UNSAFE_getByType(require('react-native').Image)).toBeTruthy();
  });

  test('shows recipes from API with cook time', async () => {
    mockList.mockResolvedValue([
      makeRecipeDetail({title: 'Pasta', cookTimeMin: 25}),
    ]);
    const {findByText} = renderWithProviders(<RecipesScreen {...stackProps} />);
    expect(await findByText(/25 min/)).toBeTruthy();
  });

  test('shows recipes without cook time', async () => {
    mockList.mockResolvedValue([
      makeRecipeDetail({title: 'Salad', cookTimeMin: null}),
    ]);
    const {findByText, queryByText} = renderWithProviders(
      <RecipesScreen {...stackProps} />,
    );
    expect(await findByText('Salad')).toBeTruthy();
    expect(queryByText(/min/)).toBeNull();
  });

  test('shows recipes from API', async () => {
    mockList.mockResolvedValue([
      makeRecipeDetail({title: 'Pasta', cookTimeMin: null}),
    ]);
    const {findByText} = renderWithProviders(<RecipesScreen {...stackProps} />);
    expect(await findByText('Pasta')).toBeTruthy();
  });

  test('navigates to RecipeDetail on card press', async () => {
    mockList.mockResolvedValue([
      makeRecipeDetail({id: 'recipe-1', title: 'Tacos'}),
    ]);
    const {findByText} = renderWithProviders(<RecipesScreen {...stackProps} />);
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
    const {getByText} = renderWithProviders(<RecipesScreen {...stackProps} />);
    expect(getByText('Loading…')).toBeTruthy();
  });

  test('loads more recipes when the list end is reached', async () => {
    const firstPage = Array.from({length: 20}, (_, index) =>
      makeRecipeDetail({id: `recipe-${index}`, title: `Recipe ${index}`}),
    );
    mockList.mockImplementation(async (params?: {offset?: number}) => {
      if (params?.offset === 0) {
        return firstPage;
      }
      return [makeRecipeDetail({id: 'recipe-20', title: 'Recipe 20'})];
    });
    const {findByText, UNSAFE_getByType} = renderWithProviders(
      <RecipesScreen {...stackProps} />,
    );
    await findByText('Recipe 0');
    const list = UNSAFE_getByType(FlatList);
    list.props.onEndReached?.();
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith({
        limit: RECIPE_LIST_PAGE_SIZE,
        offset: RECIPE_LIST_PAGE_SIZE,
      });
    });
  });

  test('does not load more when there is no next page', async () => {
    mockList.mockResolvedValue([makeRecipeDetail({title: 'Only Recipe'})]);
    const {findByText, UNSAFE_getByType} = renderWithProviders(
      <RecipesScreen {...stackProps} />,
    );
    await findByText('Only Recipe');
    UNSAFE_getByType(FlatList).props.onEndReached?.();
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(1);
    });
  });

  test('shows loading footer while fetching next page', async () => {
    const firstPage = Array.from({length: 20}, (_, index) =>
      makeRecipeDetail({id: `recipe-${index}`, title: `Recipe ${index}`}),
    );
    let resolveSecondPage!: (
      value: ReturnType<typeof makeRecipeDetail>[],
    ) => void;
    const secondPagePromise = new Promise<
      ReturnType<typeof makeRecipeDetail>[]
    >(resolve => {
      resolveSecondPage = resolve;
    });
    mockList.mockImplementation(async (params?: {offset?: number}) => {
      if (params?.offset === 0) {
        return firstPage;
      }
      return secondPagePromise;
    });
    const {findByText, getByText, UNSAFE_getByType} = renderWithProviders(
      <RecipesScreen {...stackProps} />,
    );
    await findByText('Recipe 0');
    UNSAFE_getByType(FlatList).props.onEndReached?.();
    await waitFor(() => {
      expect(getByText('Loading more…')).toBeTruthy();
    });
    await act(async () => {
      resolveSecondPage([
        makeRecipeDetail({id: 'recipe-20', title: 'Recipe 20'}),
      ]);
    });
  });

  test('does not fetch again while already loading more', async () => {
    const firstPage = Array.from({length: 20}, (_, index) =>
      makeRecipeDetail({id: `recipe-${index}`, title: `Recipe ${index}`}),
    );
    mockList.mockImplementation(async (params?: {offset?: number}) => {
      if (params?.offset === 0) {
        return firstPage;
      }
      return new Promise(() => {
        /* never resolves */
      });
    });
    const {findByText, UNSAFE_getByType} = renderWithProviders(
      <RecipesScreen {...stackProps} />,
    );
    await findByText('Recipe 0');
    const list = UNSAFE_getByType(FlatList);
    list.props.onEndReached?.();
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(2);
    });
    list.props.onEndReached?.();
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  test('shows empty state when no recipes match search', async () => {
    mockList.mockImplementation(async (params?: {search?: string}) => {
      if (params?.search === 'Nonexistent Recipe') {
        return [];
      }
      return [makeRecipeDetail({title: 'Pasta'})];
    });
    const {findByText, getByText, getByPlaceholderText} = renderWithProviders(
      <RecipesScreen {...stackProps} />,
    );
    await findByText('Pasta');
    fireEvent.changeText(
      getByPlaceholderText('Search recipes…'),
      'Nonexistent Recipe',
    );
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith({
        search: 'Nonexistent Recipe',
        limit: RECIPE_LIST_PAGE_SIZE,
        offset: 0,
      });
    });
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
    const {findByText} = renderWithProviders(
      <RecipesScreen {...stackProps} />,
      client,
    );
    fireEvent.press(await findByText('Delete'));
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
    });
    await flushQueryClient(client);
  });
});
