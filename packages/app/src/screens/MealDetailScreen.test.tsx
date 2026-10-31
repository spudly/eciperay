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
      nutrition: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      members: [
        {
          recipeId,
          sortOrder: 0,
          servings: 4,
          title: 'Test Recipe',
          imageUrl: null,
          recipeServings: 4,
          accessLost: false,
          satietyScore: null,
          nutritionStatus: null,
          calories: null,
          proteinG: null,
        },
      ],
    });
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
      await findByRole('link', {name: 'Test Recipe, 4 servings'}),
    );
    expect(Linking.openURL).toHaveBeenCalledWith(recipeHref(recipeId));
  });
});
