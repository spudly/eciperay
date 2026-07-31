import React from 'react';
import {act, fireEvent, waitFor} from '@testing-library/react-native';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

import {EditRecipeScreen} from './EditRecipeScreen';

jest.mock('../lib/api');
jest.mock('../lib/supabase', () => ({supabase: {}}));

jest.mock('@eciperay/client', () => {
  const actual = jest.requireActual('@eciperay/client');
  return {
    ...actual,
    useAuth: jest.fn(() => ({
      session: {user: {id: 'user-1'}},
      isLoading: false,
    })),
    uploadRecipeImageFromBase64: jest.fn(),
  };
});

const mockGet = api.recipes.get as jest.Mock;
const mockPut = api.recipes.put as jest.Mock;
const mockListTags = api.tags.list as jest.Mock;
const mockNavigate = jest.fn();
const stackProps = makeStackProps<RecipesStackParamList, 'EditRecipe'>(
  'EditRecipe',
  {recipeId: 'recipe-uuid-1'},
  {navigate: mockNavigate},
);

describe('EditRecipeScreen', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue(makeRecipeDetail());
    mockPut.mockResolvedValue(makeRecipeDetail());
    mockListTags.mockResolvedValue([]);
  });

  test('loads recipe and saves changes', async () => {
    const {findByText, getByText} = renderWithProviders(
      <EditRecipeScreen {...stackProps} />,
    );
    expect(await findByText('Edit Recipe')).toBeTruthy();
    fireEvent.press(getByText('Save Changes'));
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('RecipeDetail', {
        recipeId: 'recipe-uuid-1',
      });
    });
  });

  test('shows a delayed loading gate while the recipe is fetching', () => {
    jest.useFakeTimers();
    mockGet.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );
    const {queryByLabelText} = renderWithProviders(
      <EditRecipeScreen {...stackProps} />,
    );

    expect(queryByLabelText('Loading')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(queryByLabelText('Loading')).toBeTruthy();
    jest.useRealTimers();
  });
});
