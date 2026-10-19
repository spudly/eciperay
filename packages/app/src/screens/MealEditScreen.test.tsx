import React from 'react';
import {act, fireEvent, waitFor} from '@testing-library/react-native';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {MealsStackParamList} from '../navigation/types';

import {MealEditScreen} from './MealEditScreen';

jest.mock('../lib/api');

const mockListRecipes = api.recipes.list as jest.Mock;
const mockGetMeal = api.meals.get as jest.Mock;
const mockCreate = api.meals.create as jest.Mock;
const mockPut = api.meals.put as jest.Mock;
const mockReplace = jest.fn();
const mealId = '00000000-0000-4000-8000-000000000001';
const recipe = makeRecipeDetail({title: 'Pasta'});

const createProps = (params: MealsStackParamList['MealEdit']) =>
  makeStackProps<MealsStackParamList, 'MealEdit'>('MealEdit', params, {
    replace: mockReplace,
  });

describe('MealEditScreen', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockListRecipes.mockResolvedValue([recipe]);
    mockCreate.mockResolvedValue({
      id: mealId,
      userId: 'user-uuid-1',
      title: 'Dinner',
      notes: null,
      memberCount: 1,
      nutrition: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      members: [],
    });
    mockPut.mockResolvedValue({
      id: mealId,
      userId: 'user-uuid-1',
      title: 'Updated',
      notes: 'Notes',
      memberCount: 1,
      nutrition: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      members: [],
    });
  });

  test('renders new meal form', async () => {
    const {findByText} = await renderWithProviders(
      <MealEditScreen {...createProps({})} />,
    );
    expect(await findByText('Meal')).toBeTruthy();
    expect(await findByText('Title')).toBeTruthy();
    expect(await findByText('Pasta')).toBeTruthy();
  });

  test('creates meal and navigates to detail', async () => {
    const {findByText, getByPlaceholderText, getByText} =
      await renderWithProviders(<MealEditScreen {...createProps({})} />);
    await findByText('Pasta');
    await fireEvent.changeText(getByPlaceholderText('Meal title'), 'Dinner');
    await fireEvent.press(getByText('Pasta'));
    await fireEvent.press(getByText('Save meal'));
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('MealDetail', {mealId});
    });
  });

  test('loads existing meal with null notes', async () => {
    mockGetMeal.mockResolvedValue({
      id: mealId,
      userId: 'user-uuid-1',
      title: 'Sunday Dinner',
      notes: null,
      memberCount: 1,
      nutrition: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      members: [
        {
          recipeId: recipe.id,
          sortOrder: 0,
          servings: 4,
          title: 'Pasta',
          imageUrl: null,
          recipeServings: 4,
          accessLost: false,
          satietyScore: null,
          nutritionStatus: null,
          calories: null,
          proteinG: null,
        },
      ],
    });
    const {findByDisplayValue} = await renderWithProviders(
      <MealEditScreen {...createProps({mealId})} />,
    );
    expect(await findByDisplayValue('Sunday Dinner')).toBeTruthy();
  });

  test('loads existing meal for edit', async () => {
    mockGetMeal.mockResolvedValue({
      id: mealId,
      userId: 'user-uuid-1',
      title: 'Sunday Dinner',
      notes: 'Family night',
      memberCount: 1,
      nutrition: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      members: [
        {
          recipeId: recipe.id,
          sortOrder: 0,
          servings: 4,
          title: 'Pasta',
          imageUrl: null,
          recipeServings: 4,
          accessLost: false,
          satietyScore: null,
          nutritionStatus: null,
          calories: null,
          proteinG: null,
        },
      ],
    });
    const {findByDisplayValue, getByText} = await renderWithProviders(
      <MealEditScreen {...createProps({mealId})} />,
    );
    expect(await findByDisplayValue('Sunday Dinner')).toBeTruthy();
    await fireEvent.press(getByText('Save meal'));
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(mealId, expect.any(Object));
    });
  });

  test('toggles recipes and adjusts servings', async () => {
    const {findByText, getByPlaceholderText, getByText, queryByText} =
      await renderWithProviders(<MealEditScreen {...createProps({})} />);
    await findByText('Pasta');
    await fireEvent.changeText(getByPlaceholderText('Meal title'), 'Dinner');
    await fireEvent.press(getByText('Pasta'));
    await fireEvent.press(getByText('+'));
    await fireEvent.press(getByText('Pasta'));
    expect(queryByText('Servings · Pasta')).toBeNull();
  });

  test('shows save errors', async () => {
    mockCreate.mockRejectedValue(new Error('Save failed'));
    const {findByText, getByPlaceholderText, getByText} =
      await renderWithProviders(<MealEditScreen {...createProps({})} />);
    await findByText('Pasta');
    await fireEvent.changeText(getByPlaceholderText('Meal title'), 'Dinner');
    await fireEvent.press(getByText('Pasta'));
    await act(async () => {
      await fireEvent.press(getByText('Save meal'));
    });
    expect(await findByText('Save failed')).toBeTruthy();
  });
});
