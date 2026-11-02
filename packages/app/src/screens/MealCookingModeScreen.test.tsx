import React from 'react';
import {act, fireEvent} from '@testing-library/react-native';

import {
  makeQueryClient,
  makeStackProps,
  renderWithProviders,
} from '../__tests__/testUtils';
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

  test('shows the error state when the cook plan fails to load', async () => {
    mockCookPlan.mockRejectedValue(
      new Error('Unable to build cook plan for this meal'),
    );
    // Keep the meal query pending while the cook plan fails: the error
    // must bypass the loading gate before the other query settles.
    let releaseMeal!: (meal: unknown) => void;
    mockGetMeal.mockImplementation(
      () =>
        new Promise(resolve => {
          releaseMeal = resolve;
        }),
    );
    const {findByText} = await renderWithProviders(
      <MealCookingModeScreen {...stackProps} />,
    );
    expect(
      await findByText(
        "Couldn't load the cook plan for this meal. Please try again.",
      ),
    ).toBeTruthy();
    await act(async () => {
      releaseMeal({
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
      await Promise.resolve();
    });
    expect(await findByText('Sunday Dinner')).toBeTruthy();
    await fireEvent.press(await findByText('Done'));
    expect(mockNavigate).toHaveBeenCalledWith('MealDetail', {mealId});
  });

  test('shows the error state when the meal fails to load', async () => {
    mockGetMeal.mockRejectedValue(new Error('Meal not found'));
    // Keep the cook-plan query pending while the meal fails: the error
    // must bypass the loading gate before the other query settles.
    let releaseCookPlan!: (plan: unknown) => void;
    mockCookPlan.mockImplementation(
      () =>
        new Promise(resolve => {
          releaseCookPlan = resolve;
        }),
    );
    const {findByText} = await renderWithProviders(
      <MealCookingModeScreen {...stackProps} />,
    );
    expect(
      await findByText(
        "Couldn't load the cook plan for this meal. Please try again.",
      ),
    ).toBeTruthy();
    await act(async () => {
      releaseCookPlan({
        mealId,
        totalDurationMin: 10,
        timingStatus: 'ready',
        steps: [],
      });
      await Promise.resolve();
    });
    await fireEvent.press(await findByText('Done'));
    // A missing meal has no detail screen to return to (MealDetailScreen
    // gates on `!meal` forever), so Done goes to the meals hub.
    expect(mockNavigate).toHaveBeenCalledWith('MealsHub');
  });

  test('routes Done to the meals hub when the meal fails with a non-404 error', async () => {
    mockGetMeal.mockRejectedValue(new Error('Server unavailable'));
    const {findByText} = await renderWithProviders(
      <MealCookingModeScreen {...stackProps} />,
    );
    expect(
      await findByText(
        "Couldn't load the cook plan for this meal. Please try again.",
      ),
    ).toBeTruthy();
    await fireEvent.press(await findByText('Done'));
    // No meal data exists, so the detail screen would gate on `!meal`
    // forever; Done goes to the meals hub.
    expect(mockNavigate).toHaveBeenCalledWith('MealsHub');
  });

  test('keeps the cooking view when a background cook-plan refetch 404s over cached data', async () => {
    const client = makeQueryClient();
    const {findByText, queryByText} = await renderWithProviders(
      <MealCookingModeScreen {...stackProps} />,
      client,
    );
    expect(await findByText('Mix dry ingredients')).toBeTruthy();
    mockCookPlan.mockRejectedValue(new Error('Meal not found'));
    await act(async () => {
      await client.refetchQueries();
    });
    // The meal refetch still succeeds and a complete cached meal + plan
    // exists, so a background plan 404 must not replace the cooking
    // controls; Done keeps the meal-detail destination.
    expect(await findByText('Mix dry ingredients')).toBeTruthy();
    expect(
      queryByText(
        "Couldn't load the cook plan for this meal. Please try again.",
      ),
    ).toBeNull();
    await fireEvent.press(await findByText('Done'));
    expect(mockNavigate).toHaveBeenCalledWith('MealDetail', {mealId});
  });

  test('keeps the cooking view when a background refetch fails', async () => {
    const client = makeQueryClient();
    const {findByText, queryByText} = await renderWithProviders(
      <MealCookingModeScreen {...stackProps} />,
      client,
    );
    expect(await findByText('Mix dry ingredients')).toBeTruthy();
    mockGetMeal.mockRejectedValue(new Error('Server unavailable'));
    mockCookPlan.mockRejectedValue(new Error('Server unavailable'));
    await act(async () => {
      await client.refetchQueries();
    });
    // Cached meal + plan remain on screen: a refetch error is not an
    // initial-load failure and must not replace the cooking controls.
    expect(await findByText('Mix dry ingredients')).toBeTruthy();
    expect(
      queryByText(
        "Couldn't load the cook plan for this meal. Please try again.",
      ),
    ).toBeNull();
  });
});
