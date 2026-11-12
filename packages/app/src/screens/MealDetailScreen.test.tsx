import React from 'react';
import {Linking} from 'react-native';
import {fireEvent} from '@testing-library/react-native';

import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import {mealCookHref, mealEditHref, recipeHref} from '../lib/deepLinks';
import type {MealsStackParamList} from '../navigation/types';

import {MealDetailScreen} from './MealDetailScreen';

jest.mock('../lib/api');

const mockGet = api.meals.get as jest.Mock;
const mealId = '00000000-0000-4000-8000-000000000001';
const recipeId = '00000000-0000-4000-8000-000000000002';
const mockNavigate = jest.fn();
const mockParentNavigate = jest.fn();
const stackProps = makeStackProps<MealsStackParamList, 'MealDetail'>(
  'MealDetail',
  {mealId},
  {navigate: mockNavigate, getParent: () => ({navigate: mockParentNavigate})},
);

describe('MealDetailScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockParentNavigate.mockReset();
    mockGet.mockResolvedValue({
      id: mealId,
      userId: 'user-uuid-1',
      title: 'Sunday Dinner',
      notes: null,
      memberCount: 1,
      recipeCount: 1,
      nutrition: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      members: [
        {
          recipeId,
          sortOrder: 0,
          servingsToCook: 4,
          servingsToEat: 4,
          title: 'Test Recipe',
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
  });

  test('shows all five condensed values on a populated member line (#361)', async () => {
    mockGet.mockResolvedValue({
      id: mealId,
      userId: 'user-uuid-1',
      title: 'Sunday Dinner',
      notes: null,
      memberCount: 1,
      recipeCount: 1,
      nutrition: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      members: [
        {
          recipeId,
          sortOrder: 0,
          servingsToCook: 4,
          servingsToEat: 4,
          title: 'Test Recipe',
          imageUrl: null,
          recipeServings: 4,
          accessLost: false,
          satietyScore: 50,
          nutritionStatus: 'ready',
          calories: 100.4,
          proteinG: 10,
          carbsG: 25.6,
          fatG: 5,
        },
      ],
    });
    const {findByRole} = await renderWithProviders(
      <MealDetailScreen {...stackProps} />,
    );
    // The member row is a link whose accessible name carries the
    // title plus the composed subtitle (servings · condensed nutrition).
    expect(
      await findByRole('link', {
        name: 'Test Recipe, Servings to cook: 4 · Servings to eat: 4 · 100 cal · 10g protein · 26g carbs · 5g fat · satiety 50',
      }),
    ).toBeTruthy();
  });

  test('renders direct ingredients with servings-scaled nutrition (#362)', async () => {
    mockGet.mockResolvedValue({
      id: mealId,
      userId: 'user-uuid-1',
      title: 'Sunday Dinner',
      notes: null,
      memberCount: 2,
      recipeCount: 1,
      nutrition: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      members: [
        {
          recipeId,
          sortOrder: 0,
          servingsToCook: 4,
          servingsToEat: 4,
          title: 'Test Recipe',
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
      ingredients: [
        {
          name: 'Protein shake',
          quantity: 1,
          unit: 'bottle',
          sortOrder: 0,
          servingsToCook: 2,
          servingsToEat: 2,
          fiberG: null,
          sugarG: null,
          sodiumMg: null,
          preparedWeightG: null,
          satietyScore: null,
          nutritionStatus: 'ready',
          calories: 150,
          proteinG: 30,
          carbsG: 3,
          fatG: 1,
        },
      ],
    });
    const {findByText} = await renderWithProviders(
      <MealDetailScreen {...stackProps} />,
    );
    expect(await findByText('Ingredients')).toBeTruthy();
    expect(await findByText('Protein shake')).toBeTruthy();
    // Stored nutrition is per serving; the row shows the total for the
    // entry's 2 servings to eat (300 cal, not 150).
    expect(
      await findByText(
        '1 bottle · Servings to cook: 2 · Servings to eat: 2 · 300 cal · 60g protein · 6g carbs · 2g fat',
      ),
    ).toBeTruthy();
  });

  test('renders meal detail', async () => {
    const {findByText} = await renderWithProviders(
      <MealDetailScreen {...stackProps} />,
    );
    expect(await findByText('Sunday Dinner')).toBeTruthy();
    expect(await findByText('Cook meal')).toBeTruthy();
  });

  // The page's navigation crosses as deep-link hrefs now (#248): a
  // press opens the URL through Linking and the container's linking
  // config routes it to the same screens the old callbacks used.
  test('opens deep links for the navigation actions', async () => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const {findByText, findByRole} = await renderWithProviders(
      <MealDetailScreen {...stackProps} />,
    );
    await fireEvent.press(await findByText('Edit'));
    expect(Linking.openURL).toHaveBeenCalledWith(mealEditHref(mealId));
    await fireEvent.press(await findByText('Cook meal'));
    expect(Linking.openURL).toHaveBeenCalledWith(mealCookHref(mealId));
    // A member row is a link whose accessible name carries the
    // recipe's title and servings.
    await fireEvent.press(
      await findByRole('link', {
        name: 'Test Recipe, Servings to cook: 4 · Servings to eat: 4',
      }),
    );
    expect(Linking.openURL).toHaveBeenCalledWith(recipeHref(recipeId));
  });
});
