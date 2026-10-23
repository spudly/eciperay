import {tokens} from '@spudly/ui';
import {fireEvent} from '@testing-library/react-native';
import type {Meal, MealPlan} from '@eciperay/types';
import React from 'react';

import {renderWithProviders} from '../../__tests__/testUtils';

import {MealsHubView} from './MealsHubView';

const makeMealPlan = (overrides: Partial<MealPlan> = {}): MealPlan => ({
  id: 'plan-1',
  userId: 'user-1',
  title: 'Weeknight rotation',
  notes: null,
  startsOn: '2026-11-02',
  endsOn: '2026-11-08',
  entryCount: 3,
  nutrition: null,
  goalProgress: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

const makeMeal = (overrides: Partial<Meal> = {}): Meal => ({
  id: 'meal-1',
  userId: 'user-1',
  title: 'Taco Tuesday',
  notes: null,
  memberCount: 2,
  nutrition: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

const makeProps = () => ({
  onSelectTab: jest.fn(),
  meals: [] as Meal[],
  plans: [] as MealPlan[],
  isLoading: false,
  onCreateMeal: jest.fn(),
  onCreatePlan: jest.fn(),
  onMealPress: jest.fn(),
  onPlanPress: jest.fn(),
  onDeleteMeal: jest.fn(),
  onDeletePlan: jest.fn(),
});

/**
 * The Meal plans tab after the #49 rewire: MealPlansPage from @spudly/ui/pages
 * renders the tab, and this view is its app-side host. The structural pin
 * mirrors the #188 test's reasoning — jest does not run Yoga layout, so the
 * tests guard the render-tree half of the contract: the page's own scroll view
 * is the tab's only scroll view (never nested inside the hub's ScreenScroll,
 * whose gesture capture on Android strands same-direction nested scrollers),
 * and the hub chrome stays outside it.
 */
describe('MealsHubView meal plans tab (#49)', () => {
  test('renders the DS page with the composed plan meta line', async () => {
    const props = makeProps();
    const {getAllByText, getByText} = await renderWithProviders(
      <MealsHubView
        {...props}
        activeTab="plans"
        plans={[makeMealPlan()]}
      />,
    );

    // Tab label + the page's own heading.
    expect(getAllByText('Meal plans')).toHaveLength(2);
    expect(getByText('Weeknight rotation')).toBeTruthy();
    // The app's pre-composed meta line: entry count, date range.
    expect(getByText('3 entries · 2026-11-02 – 2026-11-08')).toBeTruthy();
    expect(getByText('New meal plan')).toBeTruthy();
  });

  test('composes the singular meta line without a date range', async () => {
    const props = makeProps();
    const {getByText} = await renderWithProviders(
      <MealsHubView
        {...props}
        activeTab="plans"
        plans={[makeMealPlan({entryCount: 1, startsOn: null, endsOn: null})]}
      />,
    );

    expect(getByText('1 entry')).toBeTruthy();
  });

  test('wires plan press, delete, and create to the screen callbacks', async () => {
    const props = makeProps();
    const {getByText} = await renderWithProviders(
      <MealsHubView
        {...props}
        activeTab="plans"
        plans={[makeMealPlan()]}
      />,
    );

    await fireEvent.press(getByText('Weeknight rotation'));
    expect(props.onPlanPress).toHaveBeenCalledWith('plan-1');
    await fireEvent.press(getByText('Delete'));
    expect(props.onDeletePlan).toHaveBeenCalledWith('plan-1');
    await fireEvent.press(getByText('New meal plan'));
    expect(props.onCreatePlan).toHaveBeenCalledTimes(1);
  });

  test('shows the page empty state when there are no plans', async () => {
    const props = makeProps();
    const {getByText} = await renderWithProviders(
      <MealsHubView
        {...props}
        activeTab="plans"
        plans={[]}
      />,
    );

    expect(getByText('No meal plans yet.')).toBeTruthy();
  });

  test('hosts the page as the tab root: one scroll view, chrome outside it', async () => {
    const props = makeProps();
    const {container, getByText} = await renderWithProviders(
      <MealsHubView
        {...props}
        activeTab="plans"
        plans={[makeMealPlan()]}
      />,
    );

    const scrollViews = container.queryAll(
      node => node.type === 'RCTScrollView',
    );
    expect(scrollViews).toHaveLength(1);
    // The one scroll view is the page's own shell (ScreenContainer):
    // its content child carries the DS page padding (spacing 4) —
    // Tamagui resolves the styled padding into the child's style as
    // paddingLeft/paddingRight rather than a contentContainerStyle.
    const padded = scrollViews[0].queryAll(
      node => node.props.style?.paddingLeft === tokens.spacing[4],
    );
    expect(padded).not.toHaveLength(0);
    expect(padded[0].props.style?.paddingRight).toBe(tokens.spacing[4]);
    // The tab bar lives outside the page's scroll view (pinned chrome);
    // the plan rows live inside it.
    expect(
      scrollViews[0].queryAll(node =>
        node.children.includes('Weeknight rotation'),
      ),
    ).not.toHaveLength(0);
    expect(getByText('Weeknight rotation')).toBeTruthy();
  });
});

/**
 * The Meals tab is not part of the rewire: its rows, its create action, and its
 * single ScreenScroll shell render exactly as before.
 */
describe('MealsHubView meals tab (unchanged)', () => {
  test('renders meal rows and wires the meal callbacks', async () => {
    const props = makeProps();
    const {container, getByText} = await renderWithProviders(
      <MealsHubView
        {...props}
        activeTab="meals"
        meals={[makeMeal()]}
      />,
    );

    expect(getByText('Taco Tuesday')).toBeTruthy();
    expect(getByText('2 recipes')).toBeTruthy();
    expect(
      container.queryAll(node => node.type === 'RCTScrollView'),
    ).toHaveLength(1);

    await fireEvent.press(getByText('Taco Tuesday'));
    expect(props.onMealPress).toHaveBeenCalledWith('meal-1');
    await fireEvent.press(getByText('Delete'));
    expect(props.onDeleteMeal).toHaveBeenCalledWith('meal-1');
    await fireEvent.press(getByText('New meal'));
    expect(props.onCreateMeal).toHaveBeenCalledTimes(1);
  });

  test('shows the meals empty state', async () => {
    const props = makeProps();
    const {getByText} = await renderWithProviders(
      <MealsHubView
        {...props}
        activeTab="meals"
        meals={[]}
      />,
    );

    expect(getByText('No meals yet.')).toBeTruthy();
  });
});
