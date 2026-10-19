import React from 'react';
import {fireEvent} from '@testing-library/react-native';

import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {MealsStackParamList} from '../navigation/types';

import {MealCookingModeScreen} from './MealCookingModeScreen';

jest.mock('../lib/api');

const mockGetMeal = api.meals.get as jest.Mock;
const mockCookPlan = api.meals.cookPlan as jest.Mock;
const mealId = '00000000-0000-4000-8000-000000000001';
const mockNavigate = jest.fn();
const stackProps = makeStackProps<MealsStackParamList, 'MealCookingMode'>(
  'MealCookingMode',
  {mealId},
  {navigate: mockNavigate},
);

describe('MealCookingModeScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetMeal.mockResolvedValue({
      id: mealId,
      userId: 'user-uuid-1',
      title: 'Sunday Dinner',
      notes: null,
      memberCount: 1,
      nutrition: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      members: [],
    });
    mockCookPlan.mockResolvedValue({
      mealId,
      totalDurationMin: 10,
      timingStatus: 'ready',
      steps: [
        {
          recipeId: 'recipe-1',
          recipeTitle: 'Test Recipe',
          instructionId: 'instr-1',
          stepNumber: 1,
          body: 'Mix dry ingredients',
          durationMin: 10,
          startOffsetMin: 0,
          endOffsetMin: 10,
        },
        {
          recipeId: 'recipe-1',
          recipeTitle: 'Test Recipe',
          instructionId: 'instr-2',
          stepNumber: 2,
          body: 'Bake',
          durationMin: 5,
          startOffsetMin: 10,
          endOffsetMin: 15,
        },
      ],
    });
  });

  test('renders cook mode and navigates steps', async () => {
    const {findByText} = await renderWithProviders(
      <MealCookingModeScreen {...stackProps} />,
    );
    expect(await findByText('Mix dry ingredients')).toBeTruthy();
    await fireEvent.press(await findByText('Next →'));
    expect(await findByText('Bake')).toBeTruthy();
    await fireEvent.press(await findByText('← Back'));
    expect(await findByText('Mix dry ingredients')).toBeTruthy();
    await fireEvent.press(await findByText('Done'));
    expect(mockNavigate).toHaveBeenCalledWith('MealDetail', {mealId});
  });
});
