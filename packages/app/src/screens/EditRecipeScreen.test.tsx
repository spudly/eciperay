import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';

import {EditRecipeScreen} from './EditRecipeScreen';

jest.mock('../lib/api');

const mockGet = api.recipes.get as jest.Mock;
const mockPut = api.recipes.put as jest.Mock;
const mockListTags = api.tags.list as jest.Mock;
const mockNavigate = jest.fn();
const route = {params: {recipeId: 'recipe-uuid-1'}};
const navigation = {navigate: mockNavigate} as never;

describe('EditRecipeScreen', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue(makeRecipeDetail());
    mockPut.mockResolvedValue(makeRecipeDetail());
    mockListTags.mockResolvedValue([]);
  });

  test('loads recipe and saves changes', async () => {
    const {findByText, getByText} = render(
      renderWithProviders(
        <EditRecipeScreen
          route={route}
          navigation={navigation}
        />,
      ),
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
});
