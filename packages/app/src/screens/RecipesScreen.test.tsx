import React from 'react';
import {Linking} from 'react-native';
import {fireEvent, waitFor, act} from '@testing-library/react-native';
import {queryKeys, RECIPE_LIST_PAGE_SIZE} from '@eciperay/client';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {
  flushQueryClient,
  makeQueryClient,
  renderWithProviders,
} from '../__tests__/testUtils';
import {api} from '../lib/api';
import {recipeHref} from '../lib/deepLinks';

import {RecipesScreen} from './RecipesScreen';

import type {TestInstance} from 'test-renderer';

jest.mock('../lib/api');

const mockList = api.recipes.list as jest.Mock;
const mockDelete = api.recipes.delete as jest.Mock;

// RNTL v14 renders host elements only: the list is the host scroll view
// that receives the FlatList onEndReached prop.
const findList = (container: TestInstance) =>
  container.queryAll(node => typeof node.props?.onEndReached === 'function')[0];

const triggerEndReached = async (list: {
  props: {onEndReached?: () => void};
}) => {
  await act(async () => {
    list.props.onEndReached?.();
  });
};

// Since @spudly/ui 1.15.0 the list rows are links (#248): a row is
// found by its accessible label (the recipe title) rather than by
// text, and pressing it opens the recipe's deep link through
// Linking — the screen itself takes no navigation prop anymore.
describe('RecipesScreen', () => {
  beforeEach(() => {
    mockList.mockResolvedValue([]);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  test('renders list when the form picker cache holds a flat recipe array', async () => {
    // Regression (#172): the meal-form picker caches a flat RecipeDetail[]
    // on its own key; the infinite list must not read it as {pages, ...}
    // (hasNextPage crashed reading .length of undefined pages).
    mockList.mockResolvedValue([makeRecipeDetail({title: 'Pasta'})]);
    const client = makeQueryClient();
    client.setQueryData(queryKeys.recipeFormOptions(), [
      makeRecipeDetail({title: 'PickerCached'}),
    ]);
    const {findByLabelText} = await renderWithProviders(
      <RecipesScreen />,
      client,
    );
    expect(await findByLabelText('Pasta')).toBeTruthy();
  });

  test('renders search input', async () => {
    const {findByPlaceholderText} = await renderWithProviders(
      <RecipesScreen />,
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
    const {findByLabelText, container} = await renderWithProviders(
      <RecipesScreen />,
    );
    await findByLabelText('Cake');
    expect(container.queryAll(node => node.type === 'Image')[0]).toBeTruthy();
  });

  test('shows recipes from API with cook time', async () => {
    mockList.mockResolvedValue([
      makeRecipeDetail({title: 'Pasta', cookTimeMin: 25}),
    ]);
    const {findByLabelText} = await renderWithProviders(<RecipesScreen />);
    expect(await findByLabelText(/25 min/)).toBeTruthy();
  });

  test('shows recipes without cook time', async () => {
    mockList.mockResolvedValue([
      makeRecipeDetail({title: 'Salad', cookTimeMin: null}),
    ]);
    const {findByLabelText, queryByLabelText} = await renderWithProviders(
      <RecipesScreen />,
    );
    expect(await findByLabelText('Salad')).toBeTruthy();
    expect(queryByLabelText(/min/)).toBeNull();
  });

  test('shows recipes from API', async () => {
    mockList.mockResolvedValue([
      makeRecipeDetail({title: 'Pasta', cookTimeMin: null}),
    ]);
    const {findByLabelText} = await renderWithProviders(<RecipesScreen />);
    expect(await findByLabelText('Pasta')).toBeTruthy();
  });

  test('opens the recipe deep link on card press', async () => {
    mockList.mockResolvedValue([
      makeRecipeDetail({id: 'recipe-1', title: 'Tacos'}),
    ]);
    const {findByLabelText} = await renderWithProviders(<RecipesScreen />);
    await fireEvent.press(await findByLabelText('Tacos'));
    expect(Linking.openURL).toHaveBeenCalledWith(recipeHref('recipe-1'));
  });

  test('shows loading state while fetching', async () => {
    jest.useFakeTimers();
    mockList.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );
    const {getByLabelText} = await renderWithProviders(<RecipesScreen />);

    await act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(getByLabelText('Loading')).toBeTruthy();
    jest.useRealTimers();
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
    const {findByLabelText, container} = await renderWithProviders(
      <RecipesScreen />,
    );
    await findByLabelText('Recipe 0');
    const list = findList(container);
    await triggerEndReached(list);
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith({
        limit: RECIPE_LIST_PAGE_SIZE,
        offset: RECIPE_LIST_PAGE_SIZE,
        sort: 'newest',
        sortDir: 'desc',
      });
    });
  });

  test('does not load more when there is no next page', async () => {
    mockList.mockResolvedValue([makeRecipeDetail({title: 'Only Recipe'})]);
    const {findByLabelText, container} = await renderWithProviders(
      <RecipesScreen />,
    );
    await findByLabelText('Only Recipe');
    await triggerEndReached(findList(container));
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
    const client = makeQueryClient();
    const {findByLabelText, getByLabelText, container} =
      await renderWithProviders(<RecipesScreen />, client);
    await findByLabelText('Recipe 0');
    const list = findList(container);
    await act(async () => {
      list.props.onEndReached?.();
    });
    await waitFor(() => {
      expect(getByLabelText('Loading')).toBeTruthy();
    });
    await act(async () => {
      resolveSecondPage([
        makeRecipeDetail({id: 'recipe-20', title: 'Recipe 20'}),
      ]);
      await flushQueryClient(client);
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
    const client = makeQueryClient();
    const {findByLabelText, container} = await renderWithProviders(
      <RecipesScreen />,
      client,
    );
    await findByLabelText('Recipe 0');
    const list = findList(container);
    await triggerEndReached(list);
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(2);
    });
    await act(async () => {
      await flushQueryClient(client);
    });
    await triggerEndReached(list);
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  test('shows empty state when no recipes match search', async () => {
    mockList.mockImplementation(async (params?: {search?: string}) => {
      if (params?.search === 'Nonexistent Recipe') {
        return [];
      }
      return [makeRecipeDetail({title: 'Pasta'})];
    });
    const {findByLabelText, getByText, getByPlaceholderText} =
      await renderWithProviders(<RecipesScreen />);
    await findByLabelText('Pasta');
    await fireEvent.changeText(
      getByPlaceholderText('Search recipes…'),
      'Nonexistent Recipe',
    );
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith({
        search: 'Nonexistent Recipe',
        limit: RECIPE_LIST_PAGE_SIZE,
        offset: 0,
        sort: 'newest',
        sortDir: 'desc',
      });
    });
    await waitFor(() => {
      expect(getByText('No recipes found.')).toBeTruthy();
    });
  });

  test('offers no delete action on list rows — deleting lives on the recipe detail screen', async () => {
    mockList.mockResolvedValue([makeRecipeDetail({title: 'Soup'})]);
    const {findByLabelText, queryByText} = await renderWithProviders(
      <RecipesScreen />,
    );
    expect(await findByLabelText('Soup')).toBeTruthy();
    // @spudly/ui 1.8.0 removed the list row's Delete action and the
    // `onRecipeDelete` prop; the screen no longer wires any delete
    // mutation to the list.
    expect(queryByText('Delete')).toBeNull();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
