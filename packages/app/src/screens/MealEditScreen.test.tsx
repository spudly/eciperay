import React from 'react';
import {act, fireEvent, waitFor} from '@testing-library/react-native';

import {recipeListInfiniteQueryOptions} from '@eciperay/client';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {
  makeQueryClient,
  makeStackProps,
  renderWithProviders,
} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {MealsStackParamList} from '../navigation/types';

import {MealEditScreen} from './MealEditScreen';

jest.mock('../lib/api');

const mockListRecipes = api.recipes.list as jest.Mock;
const mockGetMeal = api.meals.get as jest.Mock;
const mockCreate = api.meals.create as jest.Mock;
const mockPut = api.meals.put as jest.Mock;
const mockReplace = jest.fn();
const mealId = '00000000-0000-4000-8000-000000000001';
const recipe = makeRecipeDetail({title: 'Pasta'});

const createProps = (params: MealsStackParamList['MealEdit']) =>
  makeStackProps<MealsStackParamList, 'MealEdit'>('MealEdit', params, {
    replace: mockReplace,
  });

// The picker is a search autocomplete (#359): results only appear after
// typing in the search field and the debounced server search returning.
type Rendered = Awaited<ReturnType<typeof renderWithProviders>>;
const searchForRecipe = async (
  rendered: Rendered,
  text = 'Pasta',
): Promise<void> => {
  await fireEvent.changeText(
    rendered.getByPlaceholderText('Search recipes…'),
    text,
  );
  await rendered.findByText('Pasta', {}, {timeout: 5000});
};

describe('MealEditScreen', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockListRecipes.mockResolvedValue([recipe]);
    mockCreate.mockResolvedValue({
      id: mealId,
      userId: 'user-uuid-1',
      title: 'Dinner',
      notes: null,
      memberCount: 1,
      nutrition: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      members: [],
    });
    mockPut.mockResolvedValue({
      id: mealId,
      userId: 'user-uuid-1',
      title: 'Updated',
      notes: 'Notes',
      memberCount: 1,
      nutrition: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      members: [],
    });
  });

  test('renders picker results when the list cache holds infinite-query data', async () => {
    // Regression (#171): same cache-shape collision as MealPlanEditScreen —
    // the search query must not read the infinite list's cached shape.
    const client = makeQueryClient();
    client.setQueryData(
      recipeListInfiniteQueryOptions(params => api.recipes.list(params), {})
        .queryKey,
      {pages: [[recipe]], pageParams: [0]},
    );
    const rendered = await renderWithProviders(
      <MealEditScreen {...createProps({})} />,
      client,
    );
    await searchForRecipe(rendered);
    expect(rendered.getByText('Pasta')).toBeTruthy();
  });

  test('surfaces a recipe search failure instead of no matches', async () => {
    mockListRecipes.mockRejectedValue(new Error('boom'));
    const rendered = await renderWithProviders(
      <MealEditScreen {...createProps({})} />,
    );
    await fireEvent.changeText(
      rendered.getByPlaceholderText('Search recipes…'),
      'Pasta',
    );
    expect(
      await rendered.findByText(
        'Could not load recipes: boom',
        {},
        {timeout: 5000},
      ),
    ).toBeTruthy();
    expect(rendered.queryByText('Pasta')).toBeNull();
  });

  test('renders new meal form', async () => {
    const rendered = await renderWithProviders(
      <MealEditScreen {...createProps({})} />,
    );
    expect(await rendered.findByText('Meal')).toBeTruthy();
    expect(await rendered.findByText('Title')).toBeTruthy();
    // No library is listed before a search is typed.
    expect(rendered.queryByText('Pasta')).toBeNull();
    await searchForRecipe(rendered);
  });

  test('creates meal and navigates to detail', async () => {
    const rendered = await renderWithProviders(
      <MealEditScreen {...createProps({})} />,
    );
    await searchForRecipe(rendered);
    await fireEvent.changeText(
      rendered.getByPlaceholderText('Meal title'),
      'Dinner',
    );
    await fireEvent.press(rendered.getByText('Pasta'));
    await fireEvent.press(rendered.getByText('Save meal'));
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('MealDetail', {mealId});
    });
  });

  test('creates a meal with a direct ingredient and no recipe (#362)', async () => {
    const rendered = await renderWithProviders(
      <MealEditScreen {...createProps({})} />,
    );
    await fireEvent.changeText(
      rendered.getByPlaceholderText('Meal title'),
      'Shake only',
    );
    await fireEvent.press(rendered.getByText('Add ingredient'));
    await fireEvent.changeText(
      rendered.getByPlaceholderText('Ingredient name'),
      'Protein shake',
    );
    await fireEvent.press(rendered.getByText('Save meal'));
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Shake only',
          recipes: [],
          ingredients: [
            {name: 'Protein shake', quantity: null, unit: null, servings: 1},
          ],
        }),
      );
    });
  });

  test('loads existing meal with null notes', async () => {
    mockGetMeal.mockResolvedValue({
      id: mealId,
      userId: 'user-uuid-1',
      title: 'Sunday Dinner',
      notes: null,
      memberCount: 1,
      nutrition: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      members: [
        {
          recipeId: recipe.id,
          sortOrder: 0,
          servings: 4,
          title: 'Pasta',
          imageUrl: null,
          recipeServings: 4,
          accessLost: false,
          satietyScore: null,
          nutritionStatus: null,
          calories: null,
          proteinG: null,
          carbsG: null,
          fatG: null,
        },
      ],
    });
    const rendered = await renderWithProviders(
      <MealEditScreen {...createProps({mealId})} />,
    );
    expect(await rendered.findByDisplayValue('Sunday Dinner')).toBeTruthy();
    // The meal's recipe is already selected — its stepper renders without
    // any search.
    expect(await rendered.findByText('Servings · Pasta')).toBeTruthy();
  });

  test('loads existing meal for edit', async () => {
    mockGetMeal.mockResolvedValue({
      id: mealId,
      userId: 'user-uuid-1',
      title: 'Sunday Dinner',
      notes: 'Family night',
      memberCount: 1,
      nutrition: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      members: [
        {
          recipeId: recipe.id,
          sortOrder: 0,
          servings: 4,
          title: 'Pasta',
          imageUrl: null,
          recipeServings: 4,
          accessLost: false,
          satietyScore: null,
          nutritionStatus: null,
          calories: null,
          proteinG: null,
          carbsG: null,
          fatG: null,
        },
      ],
    });
    const rendered = await renderWithProviders(
      <MealEditScreen {...createProps({mealId})} />,
    );
    expect(await rendered.findByDisplayValue('Sunday Dinner')).toBeTruthy();
    await fireEvent.press(rendered.getByText('Save meal'));
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(mealId, expect.any(Object));
    });
  });

  test('selects, adjusts servings, and removes recipes', async () => {
    const rendered = await renderWithProviders(
      <MealEditScreen {...createProps({})} />,
    );
    await searchForRecipe(rendered);
    await fireEvent.changeText(
      rendered.getByPlaceholderText('Meal title'),
      'Dinner',
    );
    await fireEvent.press(rendered.getByText('Pasta'));
    await fireEvent.press(rendered.getByText('+'));
    await fireEvent.press(rendered.getByText('Remove'));
    expect(rendered.queryByText('Servings · Pasta')).toBeNull();
  });

  test('shows save errors', async () => {
    mockCreate.mockRejectedValue(new Error('Save failed'));
    const rendered = await renderWithProviders(
      <MealEditScreen {...createProps({})} />,
    );
    await searchForRecipe(rendered);
    await fireEvent.changeText(
      rendered.getByPlaceholderText('Meal title'),
      'Dinner',
    );
    await fireEvent.press(rendered.getByText('Pasta'));
    await act(async () => {
      await fireEvent.press(rendered.getByText('Save meal'));
    });
    expect(await rendered.findByText('Save failed')).toBeTruthy();
  });
});
