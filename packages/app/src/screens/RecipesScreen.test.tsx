import React from 'react';
import {Linking} from 'react-native';
import {fireEvent, waitFor, act} from '@testing-library/react-native';
import {
  DISCOVER_ERROR_MESSAGE,
  queryKeys,
  RECIPE_LIST_PAGE_SIZE,
} from '@eciperay/client';

import {
  makePublicRecipeDiscoveryItem,
  makeRecipeDetail,
} from '../__tests__/fixtures/recipe';
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

// The props the screen most recently passed its list view, captured by
// the wrapper mock below. Since @spudly/ui 6.x the load-more error row
// sits after a full page of own rows, beyond the virtualized list's
// rendered window in Jest, so the screen-level retry contract is
// exercised by invoking the view's onLoadMoreRetry prop and reading
// its loadMoreErrorMessage prop — the row's own rendering and press
// are pinned in RecipesListView's tests, where the row is in window.
type CapturedListViewProps = {
  loadMoreErrorMessage?: string | null;
  ownErrorMessage?: string | null;
  onLoadMoreRetry?: () => void;
  sharedRecipes?: unknown[];
  discoveryRecipes?: unknown[];
  discoveryErrorMessage?: string | null;
  loadingDiscovery?: boolean;
};

let mockListViewProps: CapturedListViewProps | null = null;

jest.mock('../hosts/recipes/RecipesListView', () => {
  const actual = jest.requireActual<
    typeof import('../hosts/recipes/RecipesListView')
  >('../hosts/recipes/RecipesListView');
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    ...actual,
    RecipesListView: (props: Parameters<typeof actual.RecipesListView>[0]) => {
      mockListViewProps = props;
      return React.createElement(actual.RecipesListView, props);
    },
  };
});

const mockList = api.recipes.list as jest.Mock;
const mockListSharedWithMe = api.recipes.listSharedWithMe as jest.Mock;
const mockListPublic = api.recipes.listPublic as jest.Mock;
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
    mockListViewProps = null;
    mockList.mockResolvedValue([]);
    mockListSharedWithMe.mockResolvedValue([]);
    mockListPublic.mockResolvedValue([]);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  test('renders list when the form picker cache holds a flat recipe array', async () => {
    // Regression (#172): the meal-form picker caches a flat RecipeDetail[]
    // on its own key; the infinite list must not read it as {pages, ...}
    // (hasNextPage crashed reading .length of undefined pages).
    mockList.mockResolvedValue([makeRecipeDetail({title: 'Pasta'})]);
    const client = makeQueryClient();
    client.setQueryData(queryKeys.recipeFormSearch('picker'), [
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

  test('a failed next page stops automatic retries and offers a manual retry', async () => {
    // Regression (#371): the DS page's end-reached signal re-fires
    // when a fetch adds no rows and cannot tell a failed page from an
    // empty one, so an ungated onLoadMore cycles automatic retries
    // after a next-page failure. The screen gates on the latched
    // fetch-next-page error and surfaces a manual retry instead.
    const firstPage = Array.from({length: RECIPE_LIST_PAGE_SIZE}, (_, index) =>
      makeRecipeDetail({id: `recipe-${index}`, title: `Recipe ${index}`}),
    );
    mockList.mockImplementation(async (params?: {offset?: number}) => {
      if (params?.offset === 0) {
        return firstPage;
      }
      throw new Error('Next page failed');
    });
    const client = makeQueryClient();
    const {findByLabelText, container} = await renderWithProviders(
      <RecipesScreen />,
      client,
    );
    await findByLabelText('Recipe 0');
    const list = findList(container);

    // The first end-reached signal fetches the next page, which
    // fails and latches the fetch-next-page error. Since
    // @spudly/ui 6.x the failure surfaces as the page's own-section
    // load-more error row (the screen passes it through the host's
    // loadMoreErrorMessage / onLoadMoreRetry props); the row sits
    // after the page of own rows, beyond the virtualized list's
    // rendered window in Jest, so its rendering and its "Try
    // again" press (issued with cancelRefetch: false, reusing an
    // in-flight retry instead of duplicating it) are pinned in
    // RecipesListView's tests, where the row is in the window.
    // The screen-level half of the contract is the latch below.
    await triggerEndReached(list);
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(2);
    });

    // Further end-reached signals must not cycle automatic retries
    // while the failed page is latched.
    await triggerEndReached(list);
    await triggerEndReached(list);
    await act(async () => {
      await flushQueryClient(client);
    });
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  test('a manual retry fetches the failed page once, dedupes while in flight, and clears the error on recovery', async () => {
    // The retry half of the #371 contract, restored at screen level:
    // the latch test above stops at the latched error because the
    // page's error row is beyond the virtualized list's rendered
    // window in Jest — so this test drives the retry through the
    // props the screen passes its list view (captured by the wrapper
    // mock at the top of this file), which is exactly what the row's
    // "Try again" press invokes in the view's own tests.
    const firstPage = Array.from({length: RECIPE_LIST_PAGE_SIZE}, (_, index) =>
      makeRecipeDetail({id: `recipe-${index}`, title: `Recipe ${index}`}),
    );
    let failNextPage = true;
    let heldRetry: Promise<ReturnType<typeof makeRecipeDetail>[]> | null = null;
    mockList.mockImplementation(async (params?: {offset?: number}) => {
      if (params?.offset === 0) {
        return firstPage;
      }
      if (failNextPage) {
        throw new Error('Next page failed');
      }
      if (heldRetry) {
        return heldRetry;
      }
      return [makeRecipeDetail({id: 'recipe-20', title: 'Recipe 20'})];
    });
    const client = makeQueryClient();
    const {findByLabelText, container} = await renderWithProviders(
      <RecipesScreen />,
      client,
    );
    await findByLabelText('Recipe 0');
    const list = findList(container);

    // The next page fails and the error latches onto the view's props.
    await triggerEndReached(list);
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(mockListViewProps?.loadMoreErrorMessage).toBe(
        "Couldn't load more recipes.",
      );
    });

    // The manual retry fetches the failed page again. The retry is
    // held in flight: the error stays latched while it runs (so the
    // row and its action stay up), exactly as the pre-6.x alert did.
    failNextPage = false;
    let resolveHeldRetry!: (
      value: ReturnType<typeof makeRecipeDetail>[],
    ) => void;
    heldRetry = new Promise<ReturnType<typeof makeRecipeDetail>[]>(resolve => {
      resolveHeldRetry = resolve;
    });
    await act(async () => {
      mockListViewProps?.onLoadMoreRetry?.();
    });
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(3);
    });
    expect(mockListViewProps?.loadMoreErrorMessage).toBe(
      "Couldn't load more recipes.",
    );

    // A retry invoked while a retry is already in flight issues no
    // duplicate request: the screen retries with
    // fetchNextPage({cancelRefetch: false}), which reuses the
    // in-flight fetch instead of cancelling and restarting it.
    await act(async () => {
      mockListViewProps?.onLoadMoreRetry?.();
      await flushQueryClient(client);
    });
    expect(mockList).toHaveBeenCalledTimes(3);

    // Once the held retry resolves, the page is loaded and the
    // load-more error clears from the view's props.
    await act(async () => {
      resolveHeldRetry([
        makeRecipeDetail({id: 'recipe-20', title: 'Recipe 20'}),
      ]);
      await flushQueryClient(client);
    });
    await waitFor(() => {
      expect(mockListViewProps?.loadMoreErrorMessage).toBeNull();
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

/**
 * The unified browse (#412): the screen drives three infinite queries
 * — own, shared-with-me, and public discovery — from the one filter
 * state, and the view renders them as the own section (created rows
 * first, then shared rows) above the discovery section.
 */
describe('RecipesScreen unified browse (#412)', () => {
  beforeEach(() => {
    mockListViewProps = null;
    mockList.mockResolvedValue([]);
    mockListSharedWithMe.mockResolvedValue([]);
    mockListPublic.mockResolvedValue([]);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  test('renders shared recipes after created rows, badged, with no log-cook control on shared rows', async () => {
    mockList.mockResolvedValue([
      makeRecipeDetail({id: 'own-1', title: 'Pasta Night'}),
    ]);
    mockListSharedWithMe.mockResolvedValue([
      makeRecipeDetail({
        id: 'shared-1',
        slug: 'shared-soup',
        title: 'Shared Soup',
        userId: 'other-user',
      }),
    ]);
    const {findByLabelText, getByText, queryByLabelText, toJSON} =
      await renderWithProviders(<RecipesScreen />);

    expect(await findByLabelText('Pasta Night')).toBeTruthy();
    expect(await findByLabelText('Shared Soup')).toBeTruthy();
    expect(getByText('Shared')).toBeTruthy();
    // Created rows keep their log-cook control; shared rows render
    // none at all (canLogCook: false — cook logs are owner-only).
    expect(queryByLabelText('Log a cook of Pasta Night')).toBeTruthy();
    expect(queryByLabelText('Log a cook of Shared Soup')).toBeNull();
    // Order: the created row renders before the shared row.
    const rendered = JSON.stringify(toJSON());
    expect(rendered.indexOf('Pasta Night')).toBeGreaterThanOrEqual(0);
    expect(rendered.indexOf('Shared Soup')).toBeGreaterThan(
      rendered.indexOf('Pasta Night'),
    );
    // The screen passes both collections to the view separately.
    expect(mockListViewProps?.sharedRecipes).toHaveLength(1);
  });

  test('renders the discovery section', async () => {
    mockListPublic.mockResolvedValue([
      makePublicRecipeDiscoveryItem({
        id: 'public-1',
        slug: 'public-pie',
        title: 'Public Pie',
      }),
    ]);
    const {findByLabelText, findByText} = await renderWithProviders(
      <RecipesScreen />,
    );

    expect(await findByLabelText('Public Pie')).toBeTruthy();
    expect(await findByText(/By Pat Public/)).toBeTruthy();
    expect(mockListViewProps?.discoveryRecipes).toHaveLength(1);
    expect(mockListViewProps?.discoveryErrorMessage).toBeNull();
  });

  test('a discovery first-page failure shows the discovery error, not an empty section', async () => {
    mockListPublic.mockRejectedValue(new Error('Discovery failed'));
    const {findByText} = await renderWithProviders(<RecipesScreen />);

    expect(await findByText(DISCOVER_ERROR_MESSAGE)).toBeTruthy();
    await waitFor(() => {
      expect(mockListViewProps?.discoveryErrorMessage).toBe(
        DISCOVER_ERROR_MESSAGE,
      );
    });
    // The own section is unaffected by the discovery failure.
    expect(mockListViewProps?.ownErrorMessage).toBeNull();
  });

  test('one search state drives all three queries', async () => {
    const {findByPlaceholderText, getByPlaceholderText} =
      await renderWithProviders(<RecipesScreen />);
    await findByPlaceholderText('Search recipes…');
    await fireEvent.changeText(
      getByPlaceholderText('Search recipes…'),
      'Soup',
    );

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({search: 'Soup'}),
      );
    });
    await waitFor(() => {
      expect(mockListSharedWithMe).toHaveBeenCalledWith(
        expect.objectContaining({search: 'Soup'}),
      );
    });
    await waitFor(() => {
      expect(mockListPublic).toHaveBeenCalledWith(
        expect.objectContaining({search: 'Soup'}),
      );
    });
  });

  test('end-reached paginates each query independently', async () => {
    const ownFirstPage = Array.from({length: RECIPE_LIST_PAGE_SIZE}, (_, i) =>
      makeRecipeDetail({id: `own-${i}`, title: `Own ${i}`}),
    );
    const sharedFirstPage = Array.from(
      {length: RECIPE_LIST_PAGE_SIZE},
      (_, i) =>
        makeRecipeDetail({
          id: `shared-${i}`,
          title: `Shared ${i}`,
          userId: 'other-user',
        }),
    );
    const discoveryFirstPage = Array.from(
      {length: RECIPE_LIST_PAGE_SIZE},
      (_, i) =>
        makePublicRecipeDiscoveryItem({
          id: `public-${i}`,
          slug: `public-${i}`,
          title: `Public ${i}`,
        }),
    );
    mockList.mockImplementation(async (params?: {offset?: number}) =>
      params?.offset === 0 ? ownFirstPage : [],
    );
    mockListSharedWithMe.mockImplementation(
      async (params?: {offset?: number}) =>
        params?.offset === 0 ? sharedFirstPage : [],
    );
    mockListPublic.mockImplementation(async (params?: {offset?: number}) =>
      params?.offset === 0 ? discoveryFirstPage : [],
    );
    const {findByLabelText, container} = await renderWithProviders(
      <RecipesScreen />,
    );
    await findByLabelText('Own 0');

    await triggerEndReached(findList(container));

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({offset: RECIPE_LIST_PAGE_SIZE}),
      );
    });
    await waitFor(() => {
      expect(mockListSharedWithMe).toHaveBeenCalledWith(
        expect.objectContaining({offset: RECIPE_LIST_PAGE_SIZE}),
      );
    });
    await waitFor(() => {
      expect(mockListPublic).toHaveBeenCalledWith(
        expect.objectContaining({offset: RECIPE_LIST_PAGE_SIZE}),
      );
    });
  });
});
