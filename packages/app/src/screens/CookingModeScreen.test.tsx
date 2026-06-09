import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import KeepAwake from 'react-native-keep-awake';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {apiFetch} from '../lib/api';

import {CookingModeScreen} from './CookingModeScreen';

jest.mock('../lib/api', () => ({apiFetch: jest.fn()}));

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

const makeProps = (recipeId = 'recipe-1') => ({
  route: {params: {recipeId}, key: 'CookingMode', name: 'CookingMode' as const},
  navigation: {goBack: jest.fn()} as never,
});

let queryClient: QueryClient;

const wrap = (element: React.ReactElement) => (
  <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>
);

describe('CookingModeScreen', () => {
  beforeEach(() => {
    queryClient = makeQueryClient();
  });

  test('renders step text from recipe', async () => {
    const recipe = makeRecipeDetail();
    mockApiFetch.mockResolvedValue(recipe);
    const {findByText} = render(wrap(<CookingModeScreen {...makeProps()} />));
    expect(await findByText(recipe.instructions[0].body)).toBeTruthy();
  });

  test('activates KeepAwake on mount', async () => {
    mockApiFetch.mockResolvedValue(makeRecipeDetail());
    render(wrap(<CookingModeScreen {...makeProps()} />));
    await waitFor(() => {
      expect(KeepAwake.activate).toHaveBeenCalled();
    });
  });

  test('deactivates KeepAwake on unmount', async () => {
    mockApiFetch.mockResolvedValue(makeRecipeDetail());
    const {unmount} = render(wrap(<CookingModeScreen {...makeProps()} />));
    await waitFor(() => {
      expect(KeepAwake.activate).toHaveBeenCalled();
    });
    unmount();
    expect(KeepAwake.deactivate).toHaveBeenCalled();
  });

  test('navigates steps with Next and Back buttons', async () => {
    const recipe = makeRecipeDetail();
    mockApiFetch.mockResolvedValue(recipe);
    const {findByText, getByText} = render(
      wrap(<CookingModeScreen {...makeProps()} />),
    );
    expect(await findByText(recipe.instructions[0].body)).toBeTruthy();
    fireEvent.press(getByText('Next →'));
    await waitFor(() => {
      expect(getByText(recipe.instructions[1].body)).toBeTruthy();
    });
    fireEvent.press(getByText('← Back'));
    await waitFor(() => {
      expect(getByText(recipe.instructions[0].body)).toBeTruthy();
    });
  });
});
