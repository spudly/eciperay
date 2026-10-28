import {screen} from '@testing-library/react';
import type {AggregatedNutrition} from '@eciperay/types';

import {renderWithProviders} from '../../test/testUtils.js';

import {NutritionGoalProgressView} from './NutritionGoalProgressView.js';

const nutrition: AggregatedNutrition = {
  calories: 45,
  proteinG: 3,
  carbsG: 5,
  fatG: 1,
  fiberG: 1,
  sugarG: 2,
  sodiumMg: 100,
  preparedWeightG: 200,
  satietyScore: 40,
  status: 'ready',
};

describe('NutritionGoalProgressView', () => {
  test('labels the goal figures as a per-day average against daily goals (#266)', async () => {
    await renderWithProviders(
      <NutritionGoalProgressView
        nutrition={nutrition}
        progressIsPerDayAverage
        progress={{
          calories: {
            goal: 2000,
            actual: 6,
            delta: -1994,
            percentOfGoal: 0.3,
            band: 'under',
          },
          proteinG: null,
          carbsG: null,
          fatG: null,
          satietyScore: null,
        }}
      />,
    );
    // The plan total and the per-day figure sit side by side; the
    // caption is what stops "6 / 2000" reading as a wrong total.
    expect(screen.getByText(/Plan total:/)).toBeInTheDocument();
    expect(screen.getByText('Calories')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Per-day average calories and protein for this plan, compared with your daily goals. Satiety is a plan-wide score.',
      ),
    ).toBeInTheDocument();
  });

  test('labels undated-plan goal figures as plan totals, not daily averages (#266)', async () => {
    await renderWithProviders(
      <NutritionGoalProgressView
        nutrition={nutrition}
        progress={{
          calories: {
            goal: 2000,
            actual: 45,
            delta: -1955,
            percentOfGoal: 2.3,
            band: 'under',
          },
          proteinG: null,
          carbsG: null,
          fatG: null,
          satietyScore: null,
        }}
      />,
    );
    // No perDay figure (undated plan): the server compared the
    // whole-plan total, so the caption must say so.
    expect(
      screen.getByText(
        'Plan-total calories and protein for this plan, compared with your daily goals. Satiety is a plan-wide score.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Per-day average calories and protein/),
    ).not.toBeInTheDocument();
  });

  test('shows no per-day caption when there is no goal progress', async () => {
    await renderWithProviders(
      <NutritionGoalProgressView
        nutrition={nutrition}
        progress={null}
      />,
    );
    expect(
      screen.getByText('Set daily nutrition goals to compare this plan.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Per-day average calories and protein/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Plan-total calories and protein/),
    ).not.toBeInTheDocument();
  });
});
