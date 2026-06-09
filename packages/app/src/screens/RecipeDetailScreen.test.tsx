import React from 'react';
import {Alert} from 'react-native';
import {render, fireEvent, waitFor} from '@testing-library/react-native';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';

import {RecipeDetailScreen} from './RecipeDetailScreen';

jest.mock('../lib/api');

const mockGet = api.recipes.get as jest.Mock;
const mockDelete = api.recipes.delete as jest.Mock;
const mockNutrition = api.ai.nutrition as jest.Mock;
const mockGetConversation = api.ai.getConversation as jest.Mock;
const mockListNotes = api.notes.list as jest.Mock;
const mockListDrafts = api.drafts.listPending as jest.Mock;
const mockNavigate = jest.fn();
const route = {params: {recipeId: 'recipe-uuid-1'}};
const navigation = {navigate: mockNavigate} as never;

describe('RecipeDetailScreen', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue(makeRecipeDetail());
    mockDelete.mockResolvedValue();
    mockNutrition.mockResolvedValue({
      calories: 250,
      proteinG: 10,
      carbsG: 30,
      fatG: 8,
      fiberG: 4,
      sodiumMg: 500,
      disclaimer: 'Estimate only',
    });
    mockGetConversation.mockResolvedValue({messages: []});
    mockListNotes.mockResolvedValue([]);
    mockListDrafts.mockResolvedValue([]);
  });

  test('renders recipe title in overview tab', async () => {
    const {findByText} = render(
      renderWithProviders(
        <RecipeDetailScreen
          route={route}
          navigation={navigation}
        />,
      ),
    );
    expect(await findByText('Test Recipe')).toBeTruthy();
  });

  test('switches to ingredients tab', async () => {
    const {findByText} = render(
      renderWithProviders(
        <RecipeDetailScreen
          route={route}
          navigation={navigation}
        />,
      ),
    );
    await findByText('Test Recipe');
    fireEvent.press(await findByText('Ingredients'));
    expect(await findByText(/Flour/)).toBeTruthy();
  });

  test('navigates to cooking mode', async () => {
    const {findByText} = render(
      renderWithProviders(
        <RecipeDetailScreen
          route={route}
          navigation={navigation}
        />,
      ),
    );
    fireEvent.press(await findByText('Start Cooking'));
    expect(mockNavigate).toHaveBeenCalledWith('CookingMode', {
      recipeId: 'recipe-uuid-1',
    });
  });

  test('navigates to edit screen', async () => {
    const {findByText} = render(
      renderWithProviders(
        <RecipeDetailScreen
          route={route}
          navigation={navigation}
        />,
      ),
    );
    fireEvent.press(await findByText('Edit'));
    expect(mockNavigate).toHaveBeenCalledWith('EditRecipe', {
      recipeId: 'recipe-uuid-1',
    });
  });

  test('switches to instructions, notes, and nutrition tabs', async () => {
    const {findByText} = render(
      renderWithProviders(
        <RecipeDetailScreen
          route={route}
          navigation={navigation}
        />,
      ),
    );
    await findByText('Test Recipe');
    fireEvent.press(await findByText('Instructions'));
    expect(await findByText('Mix dry ingredients')).toBeTruthy();
    fireEvent.press(await findByText('Notes'));
    fireEvent.press(await findByText('Nutrition'));
    expect(await findByText('250')).toBeTruthy();
  });

  test('deletes recipe from overview', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.[1]?.onPress?.();
    });
    const {findByText} = render(
      renderWithProviders(
        <RecipeDetailScreen
          route={route}
          navigation={navigation}
        />,
      ),
    );
    fireEvent.press(await findByText('Delete'));
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
