import React from 'react';
import {render, waitFor} from '@testing-library/react-native';

import {
  renderWithProviders,
  settleAsyncUpdates,
} from '../../__tests__/testUtils';
import {api} from '../../lib/api';

import {NutritionTab} from './NutritionTab';

jest.mock('../../lib/api');

const mockNutrition = api.ai.nutrition as jest.Mock;

describe('NutritionTab', () => {
  test('shows loading state', async () => {
    mockNutrition.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );
    const {getByText, unmount} = render(
      renderWithProviders(<NutritionTab recipeId="r-1" />),
    );
    expect(getByText('Estimating nutrition…')).toBeTruthy();
    unmount();
    await settleAsyncUpdates();
  });

  test('returns null when no data', async () => {
    mockNutrition.mockResolvedValue(null);
    const {queryByText} = render(
      renderWithProviders(<NutritionTab recipeId="r-1" />),
    );
    await waitFor(() => {
      expect(queryByText('Estimating nutrition…')).toBeNull();
    });
  });

  test('renders nutrition without optional fiber and sodium', async () => {
    mockNutrition.mockResolvedValue({
      calories: 200,
      proteinG: 8,
      carbsG: 20,
      fatG: 5,
      fiberG: null,
      sodiumMg: null,
      disclaimer: 'Estimate',
    });
    const {findByText, queryByText} = render(
      renderWithProviders(<NutritionTab recipeId="r-1" />),
    );
    expect(await findByText('200')).toBeTruthy();
    expect(queryByText('Fiber')).toBeNull();
  });

  test('renders nutrition data', async () => {
    mockNutrition.mockResolvedValue({
      calories: 250,
      proteinG: 10,
      carbsG: 30,
      fatG: 8,
      fiberG: 4,
      sodiumMg: 500,
      disclaimer: 'Estimate only',
    });
    const {findByText} = render(
      renderWithProviders(<NutritionTab recipeId="r-1" />),
    );
    expect(await findByText('250')).toBeTruthy();
    expect(await findByText('Estimate only')).toBeTruthy();
  });
});
