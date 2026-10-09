import {screen, waitFor} from '@testing-library/react';
import {http, HttpResponse} from 'msw';

import {server} from '../../test/msw/server.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {NutritionTab} from './NutritionTab.js';

describe('NutritionTab', () => {
  test('shows nutrition data', async () => {
    await renderWithProviders(<NutritionTab recipeId="recipe-uuid-1" />);
    await waitFor(() => {
      expect(screen.getByText('250')).toBeInTheDocument();
    });
    expect(screen.getByText('Estimates only')).toBeInTheDocument();
  });

  test('shows estimate CTA when no data', async () => {
    server.use(
      http.get('http://localhost:8080/api/recipes/:id/ai/nutrition', () =>
        HttpResponse.json(null),
      ),
    );
    await renderWithProviders(<NutritionTab recipeId="recipe-uuid-1" />);
    await waitFor(() => {
      expect(
        screen.getByText('Nutrition is not available yet.'),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', {name: 'Estimate nutrition'}),
    ).toBeInTheDocument();
  });

  test('omits optional fiber and sodium rows', async () => {
    server.use(
      http.get('http://localhost:8080/api/recipes/:id/ai/nutrition', () =>
        HttpResponse.json({
          servings: 4,
          calories: 100,
          proteinG: 5,
          carbsG: 10,
          fatG: 3,
          fiberG: null,
          sugarG: null,
          sodiumMg: null,
          disclaimer: 'Estimates only',
        }),
      ),
    );
    await renderWithProviders(<NutritionTab recipeId="recipe-uuid-1" />);
    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
    });
    expect(screen.queryByText('Fiber')).not.toBeInTheDocument();
    expect(screen.queryByText('Sodium')).not.toBeInTheDocument();
  });
});
