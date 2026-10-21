import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {recipeListInfiniteQueryOptions} from '@eciperay/client';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {
  makeQueryClient,
  makeStackProps,
  renderWithProviders,
} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {MealsStackParamList} from '../navigation/types';

import {MealPlanEditScreen} from './MealPlanEditScreen';

jest.mock('../lib/api');

const mockListMeals = api.meals.list as jest.Mock;
const mockListRecipes = api.recipes.list as jest.Mock;
const mockGetPlan = api.mealPlans.get as jest.Mock;
const mockCreate = api.mealPlans.create as jest.Mock;
const mockPut = api.mealPlans.put as jest.Mock;
const mockReplace = jest.fn();
const planId = '00000000-0000-4000-8000-000000000003';
const recipe = makeRecipeDetail({title: 'Pasta'});

const createProps = (params: MealsStackParamList['MealPlanEdit']) =>
  makeStackProps<MealsStackParamList, 'MealPlanEdit'>('MealPlanEdit', params, {
    replace: mockReplace,
  });

describe('MealPlanEditScreen', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockListMeals.mockResolvedValue([]);
    mockListRecipes.mockResolvedValue([recipe]);
    mockCreate.mockResolvedValue({
      id: planId,
      userId: 'user-uuid-1',
      title: 'Week',
      notes: null,
      startsOn: null,
      endsOn: null,
      entryCount: 1,
      nutrition: null,
      goalProgress: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      entries: [],
    });
    mockPut.mockResolvedValue({
      id: planId,
      userId: 'user-uuid-1',
      title: 'Updated',
      notes: null,
      startsOn: null,
      endsOn: null,
      entryCount: 1,
      nutrition: null,
      goalProgress: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      entries: [],
    });
  });

  test('renders picker options when the list cache holds infinite-query data', async () => {
    // Regression (#171): the recipe list caches {pages, pageParams} under
    // its key; the form picker must not read that shape as a flat array.
    const client = makeQueryClient();
    client.setQueryData(
      recipeListInfiniteQueryOptions(params => api.recipes.list(params), {})
        .queryKey,
      {pages: [[recipe]], pageParams: [0]},
    );
    const {findByText} = await renderWithProviders(
      <MealPlanEditScreen {...createProps({})} />,
      client,
    );
    expect(await findByText('Recipe \u00b7 Pasta')).toBeTruthy();
  });

  test('renders new meal plan form', async () => {
    const {findByText} = await renderWithProviders(
      <MealPlanEditScreen {...createProps({})} />,
    );
    expect(await findByText('Meal plan')).toBeTruthy();
    expect(await findByText('Title')).toBeTruthy();
    expect(await findByText('Save plan')).toBeTruthy();
  });

  test('creates plan with recipe entry', async () => {
    const {findByText, getByPlaceholderText, getByText} =
      await renderWithProviders(<MealPlanEditScreen {...createProps({})} />);
    await findByText('Recipe · Pasta');
    await fireEvent.changeText(getByPlaceholderText('Plan title'), 'Week');
    await fireEvent.press(getByText('Recipe · Pasta'));
    await fireEvent.press(getByText('Save plan'));
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('MealPlanDetail', {planId});
    });
  });

  test('adjusts entry quantity and shows save errors', async () => {
    mockCreate.mockRejectedValue(new Error('Plan failed'));
    const {findByText, getByPlaceholderText, getByText, getAllByText} =
      await renderWithProviders(<MealPlanEditScreen {...createProps({})} />);
    await findByText('Recipe · Pasta');
    await fireEvent.changeText(getByPlaceholderText('Plan title'), 'Week');
    await fireEvent.press(getByText('Recipe · Pasta'));
    await fireEvent.press(getAllByText('+')[0]);
    await fireEvent.press(getAllByText('+')[1]);
    await fireEvent.press(getByText('Save plan'));
    expect(await findByText('Plan failed')).toBeTruthy();
  });

  test('loads existing plan for edit', async () => {
    mockGetPlan.mockResolvedValue({
      id: planId,
      userId: 'user-uuid-1',
      title: 'This week',
      notes: null,
      startsOn: '2026-01-01',
      endsOn: '2026-01-07',
      entryCount: 1,
      nutrition: null,
      goalProgress: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      entries: [
        {
          type: 'recipe',
          id: 'entry-1',
          recipeId: recipe.id,
          sortOrder: 0,
          quantity: 1,
          servings: 4,
          title: 'Pasta',
          imageUrl: null,
          recipeServings: 4,
          accessLost: false,
          nutrition: null,
          satietyScore: null,
          nutritionStatus: null,
          calories: null,
          proteinG: null,
        },
      ],
    });
    const {findByDisplayValue, getByText} = await renderWithProviders(
      <MealPlanEditScreen {...createProps({planId})} />,
    );
    expect(await findByDisplayValue('This week')).toBeTruthy();
    await fireEvent.press(getByText('Save plan'));
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(planId, expect.any(Object));
    });
  });
});
