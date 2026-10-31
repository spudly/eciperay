import React from 'react';
import {Linking} from 'react-native';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import {
  mealEditHref,
  mealHref,
  mealPlanEditHref,
  mealPlanHref,
} from '../lib/deepLinks';

import {MealsHubScreen} from './MealsHubScreen';

jest.mock('../lib/api');

const mockListMeals = api.meals.list as jest.Mock;
const mockListPlans = api.mealPlans.list as jest.Mock;
const mockDeleteMeal = api.meals.delete as jest.Mock;
const mockDeletePlan = api.mealPlans.delete as jest.Mock;
const mealId = '00000000-0000-4000-8000-000000000001';
const planId = '00000000-0000-4000-8000-000000000003';

// Rows and create actions are links since @spudly/ui 1.15.0 (#248):
// a press opens the deep-link href through Linking and the
// container's linking config routes it to the same screens the old
// callbacks navigated to. Deletes stay callbacks (actions never
// render in link form). The screen takes no navigation prop.
describe('MealsHubScreen', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
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
    const {findByLabelText, findByText} = await renderWithProviders(
      <MealsHubScreen />,
    );
    expect(await findByLabelText('Sunday Dinner, 1 recipe')).toBeTruthy();
    expect(await findByText('New meal')).toBeTruthy();
  });

  test('opens deep links and deletes from both tabs', async () => {
    const {findByText, findByLabelText, getByLabelText, getByText} =
      await renderWithProviders(<MealsHubScreen />);
    await fireEvent.press(await findByLabelText('Sunday Dinner, 1 recipe'));
    expect(Linking.openURL).toHaveBeenCalledWith(mealHref(mealId));
    await fireEvent.press(getByLabelText('Delete Sunday Dinner'));
    await waitFor(() => {
      expect(mockDeleteMeal).toHaveBeenCalledWith(mealId);
    });

    await fireEvent.press(await findByText('Meal plans'));
    await fireEvent.press(await findByText('New meal plan'));
    expect(Linking.openURL).toHaveBeenCalledWith(mealPlanEditHref());
    await fireEvent.press(await findByLabelText(/This week/));
    expect(Linking.openURL).toHaveBeenCalledWith(mealPlanHref(planId));
    // The plan row's delete carries no accessible label of its own
    // (unlike the meal row's "Delete {title}") — its text is the
    // only handle.
    await fireEvent.press(getByText('Delete'));
    await waitFor(() => {
      expect(mockDeletePlan).toHaveBeenCalledWith(planId);
    });
  });

  test('creates a new meal', async () => {
    const {findByText} = await renderWithProviders(<MealsHubScreen />);
    await fireEvent.press(await findByText('New meal'));
    expect(Linking.openURL).toHaveBeenCalledWith(mealEditHref());
  });
});
