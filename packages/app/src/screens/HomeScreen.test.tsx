import React from 'react';
import {Alert, TouchableOpacity} from 'react-native';
import {fireEvent, waitFor, act} from '@testing-library/react-native';
import {
  HOME_ADD_LABEL,
  HOME_BROWSE_LABEL,
  HOME_RECENT_RECIPE_COUNT,
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderHome = () =>
    renderWithProviders(<HomeScreen {...homeProps} />, makeQueryClient());

  test('displays welcome content and actions', async () => {
    const {findByText} = renderHome();
    expect(await findByText(HOME_TITLE)).toBeTruthy();
    expect(await findByText(HOME_BROWSE_LABEL)).toBeTruthy();
    expect(await findByText(HOME_ADD_LABEL)).toBeTruthy();
    expect(await findByText('Recently viewed')).toBeTruthy();
  });

  test('navigates to Recipes tab from browse action', async () => {
    const {findByText, UNSAFE_getAllByType} = renderHome();
    await findByText(HOME_TITLE);
    const [browseButton] = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(browseButton);
    expect(mockNavigate).toHaveBeenCalledWith('Recipes', {
      screen: 'RecipesList',
    });
  });

  test('navigates to Add tab from add action', async () => {
    const {findByText, UNSAFE_getAllByType} = renderHome();
    await findByText(HOME_TITLE);
    const [, addButton] = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(addButton);
    expect(mockNavigate).toHaveBeenCalledWith('Add', {screen: 'AddScreen'});
  });

  test('shows recently viewed recipes from local history', async () => {
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-1');
    const {findByText} = renderHome();
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('recipe-1');
    });
    expect(await findByText('Soup')).toBeTruthy();
  });

  test('shows empty state when there is no view history', async () => {
    const {findByText} = renderHome();
    expect(await findByText(/Recipes you view will appear here/)).toBeTruthy();
  });

  test('refreshes recently viewed recipes when screen gains focus', async () => {
    const client = makeQueryClient();
    const invalidateSpy = jest
      .spyOn(client, 'invalidateQueries')
      .mockResolvedValue();
    renderWithProviders(<HomeScreen {...homeProps} />, client);
    await act(async () => {
      focusEffectCallback?.();
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.recipes('home-recently-viewed'),
    });
  });

  test('navigates to recipe detail when a recipe is pressed', async () => {
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-1');
    const {findByText} = renderHome();
    fireEvent.press(await findByText('Soup'));
    expect(mockNavigate).toHaveBeenCalledWith('Recipes', {
      screen: 'RecipeDetail',
      params: {recipeId: 'recipe-1'},
    });
  });

  test('deletes a recipe after confirmation', async () => {
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-1');
    const {findByText} = renderHome();
    await findByText('Soup');

    (Alert.alert as jest.Mock).mockImplementation(
      (_title, _message, buttons) => {
        buttons?.find((b: {text: string}) => b.text === 'Delete')?.onPress?.();
      },
    );

    fireEvent.press(await findByText('Delete'));
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('recipe-1');
    });
  });

  test('fetches at most the configured number of recently viewed recipes', async () => {
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-1');
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-2');
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-3');
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-4');
    mockGet.mockImplementation(async (id: string) =>
      makeRecipeDetail({id, title: `Recipe ${id}`}),
    );

    const {findByText, queryByText} = renderHome();

    expect(await findByText('Recipe recipe-4')).toBeTruthy();
    expect(await findByText('Recipe recipe-2')).toBeTruthy();
    expect(queryByText('Recipe recipe-1')).toBeNull();
    expect(mockGet).toHaveBeenCalledTimes(HOME_RECENT_RECIPE_COUNT);
  });
});
