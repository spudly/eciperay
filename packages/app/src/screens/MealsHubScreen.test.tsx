import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {MealsStackParamList} from '../navigation/types';

import {MealsHubScreen} from './MealsHubScreen';

jest.mock('../lib/api');

const mockListMeals = api.meals.list as jest.Mock;
const mockListPlans = api.mealPlans.list as jest.Mock;
const mockDeleteMeal = api.meals.delete as jest.Mock;
const mockDeletePlan = api.mealPlans.delete as jest.Mock;
const mockNavigate = jest.fn();
const mealId = '00000000-0000-4000-8000-000000000001';
const planId = '00000000-0000-4000-8000-000000000003';
const stackProps = makeStackProps<MealsStackParamList, 'MealsHub'>(
  'MealsHub',
  undefined,
  {navigate: mockNavigate},
);

describe('MealsHubScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockDeleteMeal.mockImplementation(async () => {});
    mockDeletePlan.mockImplementation(async () => {});
    mockListMeals.mockResolvedValue([
      {
        id: mealId,
        userId: 'user-uuid-1',
        title: 'Sunday Dinner',
        notes: null,
        memberCount: 1,
        nutrition: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]);
    mockListPlans.mockResolvedValue([
      {
        id: planId,
        userId: 'user-uuid-1',
        title: 'This week',
        notes: null,
        startsOn: null,
        endsOn: null,
        entryCount: 0,
        nutrition: null,
        goalProgress: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]);
  });

  test('renders meals from API', async () => {
    const {findByText} = renderWithProviders(
      <MealsHubScreen {...stackProps} />,
    );
    expect(await findByText('Sunday Dinner')).toBeTruthy();
    expect(await findByText('New meal')).toBeTruthy();
  });

  test('navigates and deletes from both tabs', async () => {
    const {findByText, getAllByText} = renderWithProviders(
      <MealsHubScreen {...stackProps} />,
    );
    fireEvent.press(await findByText('Sunday Dinner'));
    expect(mockNavigate).toHaveBeenCalledWith('MealDetail', {mealId});
    fireEvent.press(getAllByText('Delete')[0]);
    await waitFor(() => {
      expect(mockDeleteMeal).toHaveBeenCalledWith(mealId);
    });

    fireEvent.press(await findByText('Meal plans'));
    fireEvent.press(await findByText('New meal plan'));
    expect(mockNavigate).toHaveBeenCalledWith('MealPlanEdit', {});
    fireEvent.press(await findByText('This week'));
    expect(mockNavigate).toHaveBeenCalledWith('MealPlanDetail', {planId});
    fireEvent.press(getAllByText('Delete')[0]);
    await waitFor(() => {
      expect(mockDeletePlan).toHaveBeenCalledWith(planId);
    });
  });

  test('creates a new meal', async () => {
    const {findByText} = renderWithProviders(
      <MealsHubScreen {...stackProps} />,
    );
    fireEvent.press(await findByText('New meal'));
    expect(mockNavigate).toHaveBeenCalledWith('MealEdit', {});
  });
});
