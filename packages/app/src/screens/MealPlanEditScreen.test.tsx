import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

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

const createProps = (params: MealsStackParamList['MealPlanEdit']) =>
  makeStackProps<MealsStackParamList, 'MealPlanEdit'>('MealPlanEdit', params, {
    replace: mockReplace,
  });

const savedPlan = {
  id: planId,
  userId: 'user-uuid-1',
  title: 'Week',
  notes: null,
  startsOn: null,
  endsOn: null,
  entryCount: 0,
  nutrition: null,
  goalProgress: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  entries: [],
};

// The form is details-only since #646 tranche 1: title, notes,
// and dates. Entries are added and edited on the plan's view
// page; creating a plan saves it empty and lands on the view
// page, and a details save preserves the plan's entries.
describe('MealPlanEditScreen', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockListMeals.mockResolvedValue([]);
    mockListRecipes.mockResolvedValue([]);
    mockCreate.mockResolvedValue(savedPlan);
    mockPut.mockResolvedValue(savedPlan);
  });

  test('renders new meal plan form', async () => {
    const rendered = await renderWithProviders(
      <MealPlanEditScreen {...createProps({})} />,
    );
    expect(await rendered.findByText('Meal plan')).toBeTruthy();
    expect(await rendered.findByText('Title')).toBeTruthy();
    expect(await rendered.findByText('Save plan')).toBeTruthy();
    // No entry picker on the form anymore (#646, tranche 1).
    expect(
      rendered.queryByPlaceholderText('Search meals & recipes…'),
    ).toBeNull();
  });

  test('creates an empty plan and lands on its view page', async () => {
    const rendered = await renderWithProviders(
      <MealPlanEditScreen {...createProps({})} />,
    );
    await fireEvent.changeText(
      rendered.getByPlaceholderText('Plan title'),
      'Week',
    );
    await fireEvent.press(rendered.getByText('Save plan'));
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({title: 'Week', entries: []}),
      );
      expect(mockReplace).toHaveBeenCalledWith('MealPlanDetail', {planId});
    });
  });

  test('shows save errors', async () => {
    mockCreate.mockRejectedValue(new Error('Plan failed'));
    const rendered = await renderWithProviders(
      <MealPlanEditScreen {...createProps({})} />,
    );
    await fireEvent.changeText(
      rendered.getByPlaceholderText('Plan title'),
      'Week',
    );
    await fireEvent.press(rendered.getByText('Save plan'));
    expect(await rendered.findByText('Plan failed')).toBeTruthy();
  });

  test('loads existing plan and preserves its entries on a details save', async () => {
    mockGetPlan.mockResolvedValue({
      ...savedPlan,
      title: 'This week',
      startsOn: '2026-01-01',
      endsOn: '2026-01-07',
      entryCount: 1,
      entries: [
        {
          type: 'recipe',
          id: 'entry-1',
          recipeId: 'recipe-uuid-1',
          sortOrder: 0,
          quantity: 1,
          day: '2026-01-03',
          servingsToCook: 4,
          servingsToEat: 2,
          title: 'Pasta',
          imageUrl: null,
          recipeServings: 4,
          accessLost: false,
          nutrition: null,
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
      <MealPlanEditScreen {...createProps({planId})} />,
      makeQueryClient(),
    );
    expect(await rendered.findByDisplayValue('This week')).toBeTruthy();
    await fireEvent.press(rendered.getByText('Save plan'));
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        planId,
        expect.objectContaining({
          entries: [
            expect.objectContaining({
              recipeId: 'recipe-uuid-1',
              quantity: 1,
              servingsToCook: 4,
              servingsToEat: 2,
              day: '2026-01-03',
            }),
          ],
        }),
      );
    });
  });
});
