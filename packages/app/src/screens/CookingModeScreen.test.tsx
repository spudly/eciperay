import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

import {CookingModeScreen} from './CookingModeScreen';

jest.mock('../lib/api');

const mockGet = api.recipes.get as jest.Mock;
const mockGoBack = jest.fn();
const stackProps = makeStackProps<RecipesStackParamList, 'CookingMode'>(
  'CookingMode',
  {recipeId: 'recipe-uuid-1'},
  {goBack: mockGoBack},
);

describe('CookingModeScreen', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue(makeRecipeDetail());
  });

  test('renders first instruction step', async () => {
    const {findByText} = renderWithProviders(
      <CookingModeScreen {...stackProps} />,
    );
    expect(await findByText('Mix dry ingredients')).toBeTruthy();
  });

  test('advances to next step', async () => {
    const {findByText} = renderWithProviders(
      <CookingModeScreen {...stackProps} />,
    );
    await findByText('Mix dry ingredients');
    fireEvent.press(await findByText('Next →'));
    expect(await findByText('Bake at 350°F')).toBeTruthy();
  });

  test('goes to previous step', async () => {
    const {findByText} = renderWithProviders(
      <CookingModeScreen {...stackProps} />,
    );
    await findByText('Mix dry ingredients');
    fireEvent.press(await findByText('Next →'));
    fireEvent.press(await findByText('← Back'));
    expect(await findByText('Mix dry ingredients')).toBeTruthy();
  });

  test('shows scaled ingredients when servings are provided', async () => {
    const scaledProps = makeStackProps<RecipesStackParamList, 'CookingMode'>(
      'CookingMode',
      {recipeId: 'recipe-uuid-1', servings: 8},
      {goBack: mockGoBack},
    );
    const {findByText} = renderWithProviders(
      <CookingModeScreen {...scaledProps} />,
    );
    expect(await findByText('4 cups Flour')).toBeTruthy();
    expect(await findByText(/scaled to 8 servings/)).toBeTruthy();
  });

  test('goes back on Done press', async () => {
    const {findByText} = renderWithProviders(
      <CookingModeScreen {...stackProps} />,
    );
    fireEvent.press(await findByText('Done'));
    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
