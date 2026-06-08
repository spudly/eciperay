import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {apiFetch} from '../lib/api';

import {RecipeDetailScreen} from './RecipeDetailScreen';

jest.mock('../lib/api', () => ({apiFetch: jest.fn()}));

// Use require() inside factories — jest.mock factories run before module imports resolve.
jest.mock('../components/recipe/OverviewTab', () => ({
  OverviewTab: ({
    recipe,
    onStartCooking,
  }: {
    recipe: {title: string; id: string};
    onStartCooking: () => void;
  }) => {
    const R = require('react');
    const {Text, TouchableOpacity} = require('react-native');
    return R.createElement(
      R.Fragment,
      null,
      R.createElement(Text, null, recipe.title),
      R.createElement(
        TouchableOpacity,
        {onPress: onStartCooking},
        R.createElement(Text, null, 'Start Cooking'),
      ),
    );
  },
}));

jest.mock('../components/recipe/IngredientsTab', () => ({
  IngredientsTab: () =>
    require('react').createElement(
      require('react-native').Text,
      null,
      'IngredientsTab',
    ),
}));

jest.mock('../components/recipe/InstructionsTab', () => ({
  InstructionsTab: () =>
    require('react').createElement(
      require('react-native').Text,
      null,
      'InstructionsTab',
    ),
}));

jest.mock('../components/recipe/NotesTab', () => ({
  NotesTab: () =>
    require('react').createElement(
      require('react-native').Text,
      null,
      'NotesTab',
    ),
}));

jest.mock('../components/recipe/NutritionTab', () => ({
  NutritionTab: () =>
    require('react').createElement(
      require('react-native').Text,
      null,
      'NutritionTab',
    ),
}));

const mockApiFetch = apiFetch as jest.Mock;
const mockNavigate = jest.fn();
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

const makeProps = (recipeId = 'recipe-1') => ({
  route: {
    params: {recipeId},
    key: 'RecipeDetail',
    name: 'RecipeDetail' as const,
  },
  navigation: {navigate: mockNavigate, goBack: jest.fn()} as never,
});

let queryClient: QueryClient;

const wrap = (element: React.ReactElement) => (
  <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>
);

describe('RecipeDetailScreen', () => {
  beforeEach(() => {
    queryClient = makeQueryClient();
  });

  test('shows loading state while fetching', () => {
    mockApiFetch.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );
    const {getByText} = render(wrap(<RecipeDetailScreen {...makeProps()} />));
    expect(getByText('Loading…')).toBeTruthy();
  });

  test('renders 5 tab buttons after loading', async () => {
    mockApiFetch.mockResolvedValue(makeRecipeDetail());
    const {findByText, getByText} = render(
      wrap(<RecipeDetailScreen {...makeProps()} />),
    );
    // Wait for the data to load once, then check remaining tabs synchronously
    await findByText('Overview');
    expect(getByText('Ingredients')).toBeTruthy();
    expect(getByText('Instructions')).toBeTruthy();
    expect(getByText('Notes')).toBeTruthy();
    expect(getByText('Nutrition')).toBeTruthy();
  });

  test('switches to Ingredients tab on press', async () => {
    mockApiFetch.mockResolvedValue(makeRecipeDetail());
    const {findByText, getByText} = render(
      wrap(<RecipeDetailScreen {...makeProps()} />),
    );
    await findByText('Overview');
    fireEvent.press(getByText('Ingredients'));
    await waitFor(() => {
      expect(getByText('IngredientsTab')).toBeTruthy();
    });
  });

  test('switches to Instructions tab', async () => {
    mockApiFetch.mockResolvedValue(makeRecipeDetail());
    const {findByText, getByText} = render(
      wrap(<RecipeDetailScreen {...makeProps()} />),
    );
    await findByText('Overview');
    fireEvent.press(getByText('Instructions'));
    await waitFor(() => {
      expect(getByText('InstructionsTab')).toBeTruthy();
    });
  });

  test('switches to Notes tab', async () => {
    mockApiFetch.mockResolvedValue(makeRecipeDetail());
    const {findByText, getByText} = render(
      wrap(<RecipeDetailScreen {...makeProps()} />),
    );
    await findByText('Overview');
    fireEvent.press(getByText('Notes'));
    await waitFor(() => {
      expect(getByText('NotesTab')).toBeTruthy();
    });
  });

  test('switches to Nutrition tab', async () => {
    mockApiFetch.mockResolvedValue(makeRecipeDetail());
    const {findByText, getByText} = render(
      wrap(<RecipeDetailScreen {...makeProps()} />),
    );
    await findByText('Overview');
    fireEvent.press(getByText('Nutrition'));
    await waitFor(() => {
      expect(getByText('NutritionTab')).toBeTruthy();
    });
  });

  test('navigates to CookingMode when Start Cooking pressed', async () => {
    const recipe = makeRecipeDetail({id: 'r-1'});
    mockApiFetch.mockResolvedValue(recipe);
    const {findByText, getByText} = render(
      wrap(<RecipeDetailScreen {...makeProps('r-1')} />),
    );
    await findByText(recipe.title);
    fireEvent.press(getByText('Start Cooking'));
    expect(mockNavigate).toHaveBeenCalledWith('CookingMode', {recipeId: 'r-1'});
  });
});
