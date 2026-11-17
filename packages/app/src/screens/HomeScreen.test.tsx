import React from 'react';
import {Alert, Linking} from 'react-native';
import {fireEvent, waitFor} from '@testing-library/react-native';
import {
  HOME_ADD_LABEL,
  HOME_BROWSE_LABEL,
  HOME_RECENT_RECIPE_COUNT,
  HOME_SHARED_WITH_ME_LABEL,
  HOME_TITLE,
  queryKeys,
  recordRecipeView,
} from '@eciperay/client';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {
  makeQueryClient,
  makeTabProps,
  renderWithProviders,
} from '../__tests__/testUtils';
import {api} from '../lib/api';
import {
  addHref,
  recipeHref,
  recipesHref,
  sharedWithMeHref,
} from '../lib/deepLinks';
import {recipeViewHistoryStorage} from '../lib/recipeViewHistoryStorage';
import type {RootTabParamList} from '../navigation/types';

import {HomeScreen} from './HomeScreen';

jest.mock('../lib/api');

const mockStorageMap = new Map<string, string>();

jest.mock('../lib/recipeViewHistoryStorage', () => ({
  recipeViewHistoryStorage: {
    getItem: (key: string) => mockStorageMap.get(key) ?? null,
    setItem: (key: string, value: string) => {
      mockStorageMap.set(key, value);
    },
    removeItem: (key: string) => {
      mockStorageMap.delete(key);
    },
  },
}));

let focusEffectCallback: (() => undefined | (() => void)) | undefined;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useFocusEffect: (callback: () => undefined | (() => void)) => {
      focusEffectCallback = callback;
    },
  };
});

const mockGet = api.recipes.get as jest.Mock;
const mockDelete = api.recipes.delete as jest.Mock;
const mockNavigate = jest.fn();

const homeProps = makeTabProps<RootTabParamList, 'Home'>('Home', undefined, {
  navigate: mockNavigate,
});

describe('HomeScreen', () => {
  beforeEach(() => {
    mockStorageMap.clear();
    mockGet.mockResolvedValue(
      makeRecipeDetail({id: 'recipe-1', title: 'Soup'}),
    );
    mockDelete.mockImplementation(async () => {});
    mockNavigate.mockReset();
    jest.spyOn(Alert, 'alert');
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderHome = async () =>
    await renderWithProviders(<HomeScreen {...homeProps} />, makeQueryClient());

  test('displays welcome content and actions', async () => {
    const {findByText} = await renderHome();
    expect(await findByText(HOME_TITLE)).toBeTruthy();
    expect(await findByText(HOME_BROWSE_LABEL)).toBeTruthy();
    expect(await findByText(HOME_ADD_LABEL)).toBeTruthy();
    expect(await findByText(HOME_SHARED_WITH_ME_LABEL)).toBeTruthy();
    expect(await findByText('Recently viewed')).toBeTruthy();
  });

  // The home actions are hrefs now (#248): a press opens the deep
  // link through Linking and the container's linking config routes
  // it to the same destinations the old callbacks navigated to.
  test('opens the recipes deep link from browse action', async () => {
    const {findByText} = await renderHome();
    await findByText(HOME_TITLE);
    await fireEvent.press(await findByText(HOME_BROWSE_LABEL));
    expect(Linking.openURL).toHaveBeenCalledWith(recipesHref);
  });

  test('opens the add deep link from add action', async () => {
    const {findByText} = await renderHome();
    await findByText(HOME_TITLE);
    await fireEvent.press(await findByText(HOME_ADD_LABEL));
    expect(Linking.openURL).toHaveBeenCalledWith(addHref);
  });

  test('opens the shared-with-me deep link from home action', async () => {
    const {findByText} = await renderHome();
    await findByText(HOME_TITLE);
    await fireEvent.press(await findByText(HOME_SHARED_WITH_ME_LABEL));
    expect(Linking.openURL).toHaveBeenCalledWith(sharedWithMeHref);
    // Since #412 the shared-with-me entry lands on the unified
    // Recipes browse, so its href IS the Recipes destination.
    expect(sharedWithMeHref).toBe(recipesHref);
  });

  test('shows recently viewed recipes from local history', async () => {
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-1');
    const client = makeQueryClient();
    const invalidateSpy = jest
      .spyOn(client, 'invalidateQueries')
      .mockResolvedValue();
    const {findByLabelText} = await renderWithProviders(
      <HomeScreen {...homeProps} />,
      client,
    );
    focusEffectCallback?.();
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.recipes('home-recently-viewed'),
    });
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('recipe-1');
    });
    // Row titles are the DS link rows' accessible names on native
    // (the RecipesListView test convention), not plain text nodes.
    expect(await findByLabelText('Soup')).toBeTruthy();
  });

  test('shows empty state when there is no view history', async () => {
    const {findByText} = await renderHome();
    expect(await findByText(/Recipes you view will appear here/)).toBeTruthy();
  });

  test('opens the recipe deep link when a recipe row is pressed', async () => {
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-1');
    const {findByLabelText} = await renderHome();
    // Rows are real links in the shared DS row (#532): a press opens
    // the recipe's deep link through Linking.
    await fireEvent.press(await findByLabelText('Soup'));
    expect(Linking.openURL).toHaveBeenCalledWith(
      recipeHref(makeRecipeDetail({id: 'recipe-1', title: 'Soup'})),
    );
  });

  test('offers no delete control on recently viewed rows (#532)', async () => {
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-1');
    const {findByLabelText, queryByText} = await renderHome();
    await findByLabelText('Soup');
    // Delete lives on the recipe details page only (Stephen,
    // 2026-10-24): the shared DS row renders no delete control.
    expect(queryByText('Delete')).toBeNull();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  test('fetches at most the configured number of recently viewed recipes', async () => {
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-1');
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-2');
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-3');
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-4');
    mockGet.mockImplementation(async (id: string) =>
      makeRecipeDetail({id, title: `Recipe ${id}`}),
    );

    const {findByLabelText, queryByLabelText} = await renderHome();

    expect(await findByLabelText('Recipe recipe-4')).toBeTruthy();
    expect(await findByLabelText('Recipe recipe-2')).toBeTruthy();
    expect(queryByLabelText('Recipe recipe-1')).toBeNull();
    expect(mockGet).toHaveBeenCalledTimes(HOME_RECENT_RECIPE_COUNT);
  });
});
