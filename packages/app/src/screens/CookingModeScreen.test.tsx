import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';

import {CookingModeScreen} from './CookingModeScreen';

jest.mock('../lib/api');

const mockGet = api.recipes.get as jest.Mock;
const mockGoBack = jest.fn();
const route = {params: {recipeId: 'recipe-uuid-1'}};
const navigation = {goBack: mockGoBack} as never;

describe('CookingModeScreen', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue(makeRecipeDetail());
  });

  test('renders first instruction step', async () => {
    const {findByText} = render(
      renderWithProviders(
        <CookingModeScreen
          route={route}
          navigation={navigation}
        />,
      ),
    );
    expect(await findByText('Mix dry ingredients')).toBeTruthy();
  });

  test('advances to next step', async () => {
    const {findByText} = render(
      renderWithProviders(
        <CookingModeScreen
          route={route}
          navigation={navigation}
        />,
      ),
    );
    await findByText('Mix dry ingredients');
    fireEvent.press(await findByText('Next →'));
    expect(await findByText('Bake at 350°F')).toBeTruthy();
  });

  test('goes to previous step', async () => {
    const {findByText} = render(
      renderWithProviders(
        <CookingModeScreen
          route={route}
          navigation={navigation}
        />,
      ),
    );
    await findByText('Mix dry ingredients');
    fireEvent.press(await findByText('Next →'));
    fireEvent.press(await findByText('← Back'));
    expect(await findByText('Mix dry ingredients')).toBeTruthy();
  });

  test('goes back on Done press', async () => {
    const {findByText} = render(
      renderWithProviders(
        <CookingModeScreen
          route={route}
          navigation={navigation}
        />,
      ),
    );
    fireEvent.press(await findByText('Done'));
    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
