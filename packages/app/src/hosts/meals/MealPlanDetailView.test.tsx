import {fireEvent} from '@testing-library/react-native';
import type {
  AggregatedNutrition,
  MealPlanDetail,
  MealPlanNutrition,
} from '@eciperay/types';
import React from 'react';

import {renderWithProviders} from '../../__tests__/testUtils';

import {MealPlanDetailView} from './MealPlanDetailView';

/**
 * The MealPlanDetailView host contract (#49, Wave A): the design system's
 * MealPlanDetailPage renders the screen, so these tests pin what the host
 * composes for it — the plan meta lines, the goal rows with the app's rounding
 * and band wording, the entry meta lines, and the press routing — in the same
 * composition the hand-rolled view rendered. The screen test covers the same
 * surface end to end through the query.
 */

const nutrition = (
  overrides: Partial<AggregatedNutrition> = {},
): AggregatedNutrition => ({
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
  ...overrides,
});

const planNutrition = (
  overrides: Partial<AggregatedNutrition> = {},
): MealPlanNutrition => ({...nutrition(overrides), perDay: null});

const makePlan = (overrides: Partial<MealPlanDetail> = {}): MealPlanDetail => ({
  id: 'plan-1',
  userId: 'user-1',
  title: 'This week',
  notes: 'Use up the spinach',
  startsOn: '2026-10-19',
  endsOn: '2026-10-25',
  entryCount: 2,
  nutrition: planNutrition(),
  goalProgress: null,
  createdAt: '2026-10-18T00:00:00.000Z',
  updatedAt: '2026-10-18T00:00:00.000Z',
  entries: [
    {
      type: 'meal',
      id: 'entry-meal',
      mealId: 'meal-1',
      sortOrder: 0,
      quantity: 2,
      title: 'Sunday Dinner',
      memberCount: 3,
      nutrition: nutrition({calories: 300, proteinG: 20, satietyScore: null}),
    },
    {
      type: 'recipe',
      id: 'entry-recipe',
      recipeId: 'recipe-1',
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
  ...overrides,
});

const handlers = () => ({
  onEdit: jest.fn(),
  onShoppingList: jest.fn(),
  onMealPress: jest.fn(),
  onRecipePress: jest.fn(),
  onSetGoalsPress: jest.fn(),
});

describe('MealPlanDetailView', () => {
  test('renders the plan meta lines composed from the plan', async () => {
    const {findByText} = await renderWithProviders(
      <MealPlanDetailView
        plan={makePlan()}
        {...handlers()}
      />,
    );
    expect(await findByText('This week')).toBeTruthy();
    expect(await findByText('Use up the spinach')).toBeTruthy();
    // The raw date strings joined with " – ", unreformatted.
    expect(await findByText('2026-10-19 – 2026-10-25')).toBeTruthy();
    // The standalone nutrition line, and the same summary again inside
    // the goals section as its Plan total line.
    expect(await findByText('500 cal · 30g protein · satiety 50')).toBeTruthy();
    expect(
      await findByText('Plan total: 500 cal · 30g protein · satiety 50'),
    ).toBeTruthy();
  });

  test('omits the date range unless the plan has both dates', async () => {
    const {queryByText} = await renderWithProviders(
      <MealPlanDetailView
        plan={makePlan({endsOn: null})}
        {...handlers()}
      />,
    );
    expect(queryByText(/2026-10-19/)).toBeNull();
  });

  test('composes goal rows with the app rounding and band wording', async () => {
    const plan = makePlan({
      goalProgress: {
        calories: {
          goal: 2000,
          actual: 850.4,
          delta: -1149.6,
          percentOfGoal: 42.5,
          band: 'under',
        },
        proteinG: {
          goal: 120,
          actual: 120,
          delta: 0,
          percentOfGoal: 100,
          band: 'onTrack',
        },
        carbsG: null,
        fatG: null,
        satietyScore: {
          goal: 60,
          actual: 75,
          delta: 15,
          percentOfGoal: 125,
          band: 'over',
        },
      },
    });
    const {findByText, queryByText} = await renderWithProviders(
      <MealPlanDetailView
        plan={plan}
        {...handlers()}
      />,
    );
    expect(await findByText('850 / 2000 · Below goal')).toBeTruthy();
    expect(await findByText('120 / 120 · On track')).toBeTruthy();
    expect(await findByText('75 / 60 · Above goal')).toBeTruthy();
    // Progress present: no set-goals hint.
    expect(
      queryByText('Set daily nutrition goals to compare this plan.'),
    ).toBeNull();
  });

  test('shows the set-goals hint when there is nutrition but no progress', async () => {
    const props = handlers();
    const {findByText} = await renderWithProviders(
      <MealPlanDetailView
        plan={makePlan()}
        {...props}
      />,
    );
    expect(
      await findByText('Set daily nutrition goals to compare this plan.'),
    ).toBeTruthy();
    fireEvent.press(await findByText('Set nutrition goals'));
    expect(props.onSetGoalsPress).toHaveBeenCalledTimes(1);
  });

  test('shows the set-goals hint when nutrition is present but unavailable and there is no progress', async () => {
    const props = handlers();
    const {findByText, queryByText} = await renderWithProviders(
      <MealPlanDetailView
        plan={makePlan({nutrition: planNutrition({status: 'unavailable'})})}
        {...props}
      />,
    );
    // No summary line anywhere — the formatter returns none — but the
    // goals section is forced visible with its hint (DS #78 "shown").
    expect(queryByText(/Plan total:/)).toBeNull();
    expect(
      await findByText('Set daily nutrition goals to compare this plan.'),
    ).toBeTruthy();
    fireEvent.press(await findByText('Set nutrition goals'));
    expect(props.onSetGoalsPress).toHaveBeenCalledTimes(1);
  });

  test('composes goal rows when nutrition is unavailable but progress exists', async () => {
    const plan = makePlan({
      nutrition: planNutrition({status: 'unavailable'}),
      goalProgress: {
        calories: {
          goal: 2000,
          actual: 500,
          delta: -1500,
          percentOfGoal: 25,
          band: 'under',
        },
        proteinG: null,
        carbsG: null,
        fatG: null,
        satietyScore: null,
      },
    });
    const {findByText, queryByText} = await renderWithProviders(
      <MealPlanDetailView
        plan={plan}
        {...handlers()}
      />,
    );
    // "auto" branch: progress alone drives the section — rows, no hint.
    expect(await findByText('500 / 2000 · Below goal')).toBeTruthy();
    expect(
      queryByText('Set daily nutrition goals to compare this plan.'),
    ).toBeNull();
  });

  test('renders no goals section when the plan has neither progress nor nutrition', async () => {
    const {queryByText} = await renderWithProviders(
      <MealPlanDetailView
        plan={makePlan({nutrition: null})}
        {...handlers()}
      />,
    );
    expect(queryByText('Nutrition goals')).toBeNull();
    expect(
      queryByText('Set daily nutrition goals to compare this plan.'),
    ).toBeNull();
  });

  test('composes entry meta lines and routes entry presses by kind', async () => {
    const props = handlers();
    const {findByText} = await renderWithProviders(
      <MealPlanDetailView
        plan={makePlan()}
        {...props}
      />,
    );
    expect(
      await findByText('Qty 2 · 3 recipes · 300 cal · 20g protein'),
    ).toBeTruthy();
    expect(await findByText('Qty 1 · 4 servings')).toBeTruthy();
    fireEvent.press(await findByText('Meal · Sunday Dinner'));
    expect(props.onMealPress).toHaveBeenCalledWith('meal-1');
    fireEvent.press(await findByText('Recipe · Test Recipe'));
    expect(props.onRecipePress).toHaveBeenCalledWith('recipe-1');
  });

  test('an access-lost recipe entry shows its suffix and carries no press', async () => {
    const props = handlers();
    const plan = makePlan();
    const recipeEntry = plan.entries[1];
    if (recipeEntry?.type !== 'recipe') {
      throw new Error('fixture entry 1 must be the recipe entry');
    }
    recipeEntry.accessLost = true;
    const {findByText} = await renderWithProviders(
      <MealPlanDetailView
        plan={plan}
        {...props}
      />,
    );
    const title = await findByText('Recipe · Test Recipe (unavailable)');
    // The DS row mirrors the app's disabled Pressable: no press handler
    // anywhere above the title, and the row is marked disabled.
    let node: typeof title | null = title;
    let sawPress = false;
    let sawDisabled = false;
    while (node) {
      if (typeof node.props.onPress === 'function') {
        sawPress = true;
      }
      if (node.props.accessibilityState?.disabled) {
        sawDisabled = true;
      }
      node = node.parent;
    }
    expect(sawPress).toBe(false);
    expect(sawDisabled).toBe(true);
    expect(props.onRecipePress).not.toHaveBeenCalled();
  });

  test('routes the Shopping list and Edit actions', async () => {
    const props = handlers();
    const {findByText} = await renderWithProviders(
      <MealPlanDetailView
        plan={makePlan()}
        {...props}
      />,
    );
    fireEvent.press(await findByText('Shopping list'));
    expect(props.onShoppingList).toHaveBeenCalledTimes(1);
    fireEvent.press(await findByText('Edit'));
    expect(props.onEdit).toHaveBeenCalledTimes(1);
  });
});
