import React from 'react';
import {fireEvent} from '@testing-library/react-native';

import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {MealsStackParamList} from '../navigation/types';

import {MealPlanDetailScreen} from './MealPlanDetailScreen';

jest.mock('../lib/api');

const mockGet = api.mealPlans.get as jest.Mock;
const planId = '00000000-0000-4000-8000-000000000003';
const mealId = '00000000-0000-4000-8000-000000000001';
const recipeId = '00000000-0000-4000-8000-000000000002';
const mockNavigate = jest.fn();
const mockParentNavigate = jest.fn();
const stackProps = makeStackProps<MealsStackParamList, 'MealPlanDetail'>(
  'MealPlanDetail',
  {planId},
  {navigate: mockNavigate, getParent: () => ({navigate: mockParentNavigate})},
);

describe('MealPlanDetailScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockParentNavigate.mockReset();
    mockGet.mockResolvedValue({
      id: planId,
      userId: 'user-uuid-1',
      title: 'This week',
      notes: null,
      startsOn: null,
      endsOn: null,
      entryCount: 2,
      nutrition: {
        calories: 500,
        proteinG: 30,
        carbsG: 40,
        fatG: 10,
        fiberG: 5,
        sugarG: 8,
        sodiumMg: 900,
        preparedWeightG: 800,
        satietyScore: 50,
        status: 'ready',
        perDay: null,
      },
      goalProgress: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      entries: [
        {
          type: 'meal',
          id: 'entry-meal',
          mealId,
          sortOrder: 0,
          quantity: 1,
          title: 'Sunday Dinner',
          memberCount: 1,
          nutrition: null,
        },
        {
          type: 'recipe',
          id: 'entry-recipe',
          recipeId,
          sortOrder: 1,
          quantity: 1,
          servings: 4,
          title: 'Test Recipe',
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
  });

  test('renders plan detail', async () => {
    const {findByText} = await renderWithProviders(
      <MealPlanDetailScreen {...stackProps} />,
    );
    expect(await findByText('This week')).toBeTruthy();
    expect(await findByText('Shopping list')).toBeTruthy();
  });

  test('handles navigation actions', async () => {
    const {findByText} = await renderWithProviders(
      <MealPlanDetailScreen {...stackProps} />,
    );
    await fireEvent.press(await findByText('Edit'));
    expect(mockNavigate).toHaveBeenCalledWith('MealPlanEdit', {planId});
    await fireEvent.press(await findByText('Shopping list'));
    expect(mockNavigate).toHaveBeenCalledWith('ShoppingList', {planId});
    await fireEvent.press(await findByText('Meal · Sunday Dinner'));
    expect(mockNavigate).toHaveBeenCalledWith('MealDetail', {mealId});
    await fireEvent.press(await findByText('Recipe · Test Recipe'));
    expect(mockParentNavigate).toHaveBeenCalledWith('Recipes', {
      screen: 'RecipeDetail',
      params: {recipeId},
    });
    await fireEvent.press(await findByText('Set nutrition goals'));
    expect(mockParentNavigate).toHaveBeenCalledWith('Profile', {
      screen: 'ProfileHome',
    });
  });
});
