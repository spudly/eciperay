import React from 'react';
import {render, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import {apiFetch} from '../../lib/api';

import {NutritionTab} from './NutritionTab';

jest.mock('../../lib/api', () => ({apiFetch: jest.fn()}));

const mockApiFetch = apiFetch as jest.Mock;

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
      },
    },
  });

let queryClient: QueryClient;

const wrap = (element: React.ReactElement) => (
  <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>
);

const NUTRITION = {
  calories: 350,
  proteinG: 12,
  carbsG: 45,
  fatG: 10,
  fiberG: 3,
  sodiumMg: 400,
  disclaimer: 'AI-estimated values.',
};

describe('NutritionTab', () => {
  beforeEach(() => {
    queryClient = makeQueryClient();
  });

  test('shows loading state while fetching', () => {
    mockApiFetch.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );
    const {getByText} = render(wrap(<NutritionTab recipeId="r-1" />));
    expect(getByText('Estimating nutrition…')).toBeTruthy();
  });

  test('renders nutrition rows from API data', async () => {
    mockApiFetch.mockResolvedValue(NUTRITION);
    const {findByText, getByText} = render(
      wrap(<NutritionTab recipeId="r-1" />),
    );
    await findByText('Calories');
    expect(getByText('350')).toBeTruthy();
    expect(getByText('Protein')).toBeTruthy();
  });

  test('returns null when data query returns undefined', async () => {
    mockApiFetch.mockResolvedValue(null);
    const {queryByText} = render(wrap(<NutritionTab recipeId="r-1" />));
    await waitFor(() => {
      expect(queryByText('Estimating nutrition…')).toBeNull();
    });
  });

  test('shows disclaimer text', async () => {
    mockApiFetch.mockResolvedValue(NUTRITION);
    const {findByText, getByText} = render(
      wrap(<NutritionTab recipeId="r-1" />),
    );
    await findByText('Calories');
    expect(getByText('AI-estimated values.')).toBeTruthy();
  });

  test('omits Fiber and Sodium rows when values are 0', async () => {
    mockApiFetch.mockResolvedValue({...NUTRITION, fiberG: 0, sodiumMg: 0});
    const {findByText, queryByText} = render(
      wrap(<NutritionTab recipeId="r-1" />),
    );
    await findByText('Calories');
    expect(queryByText('Fiber')).toBeNull();
    expect(queryByText('Sodium')).toBeNull();
  });
});
