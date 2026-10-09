import React from 'react';
import {fireEvent} from '@testing-library/react-native';

import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
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
    const {findByText} = renderWithProviders(
      <MealDetailScreen {...stackProps} />,
    );
    expect(await findByText('Sunday Dinner')).toBeTruthy();
    expect(await findByText('Cook meal')).toBeTruthy();
  });

  test('handles navigation actions', async () => {
    const {findByText} = renderWithProviders(
      <MealDetailScreen {...stackProps} />,
    );
    fireEvent.press(await findByText('Edit'));
    expect(mockNavigate).toHaveBeenCalledWith('MealEdit', {mealId});
    fireEvent.press(await findByText('Cook meal'));
    expect(mockNavigate).toHaveBeenCalledWith('MealCookingMode', {mealId});
    fireEvent.press(await findByText('Test Recipe'));
    expect(mockParentNavigate).toHaveBeenCalledWith('Recipes', {
      screen: 'RecipeDetail',
      params: {recipeId},
    });
  });
});
