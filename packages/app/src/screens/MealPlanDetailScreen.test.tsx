import React from 'react';
import {fireEvent} from '@testing-library/react-native';
import {Linking} from 'react-native';

import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import {
  mealHref,
  mealPlanEditHref,
  profileHref,
  recipeHref,
  shoppingListHref,
} from '../lib/deepLinks';
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

  // Navigation crosses into the DS page as deep-link hrefs (#248):
  // a press opens the URL through Linking and the container's
  // linking config routes it to the same screens.
  test('opens deep links for the navigation actions', async () => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const {findByText, findByLabelText} = await renderWithProviders(
      <MealPlanDetailScreen {...stackProps} />,
    );
    await fireEvent.press(await findByText('Edit'));
    expect(Linking.openURL).toHaveBeenCalledWith(mealPlanEditHref(planId));
    await fireEvent.press(await findByText('Shopping list'));
    expect(Linking.openURL).toHaveBeenCalledWith(shoppingListHref(planId));
    await fireEvent.press(await findByLabelText(/Meal · Sunday Dinner, Qty/));
    expect(Linking.openURL).toHaveBeenCalledWith(mealHref(mealId));
    await fireEvent.press(await findByLabelText(/Recipe · Test Recipe, Qty/));
    expect(Linking.openURL).toHaveBeenCalledWith(recipeHref(recipeId));
    await fireEvent.press(await findByText('Set nutrition goals'));
    expect(Linking.openURL).toHaveBeenCalledWith(profileHref);
  });
});
