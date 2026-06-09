import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';

import {ImportReviewScreen} from './ImportReviewScreen';

jest.mock('../lib/api');

const mockGet = api.recipes.get as jest.Mock;
const mockPut = api.recipes.put as jest.Mock;
const mockGetParent = jest.fn().mockReturnValue({navigate: jest.fn()});
const route = {params: {recipeId: 'recipe-uuid-1'}};
const navigation = {getParent: mockGetParent} as never;

describe('ImportReviewScreen', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue(makeRecipeDetail());
    mockPut.mockResolvedValue(makeRecipeDetail());
  });

  test('loads recipe and saves on submit', async () => {
    const {findByText, getByText} = render(
      renderWithProviders(
        <ImportReviewScreen
          route={route}
          navigation={navigation}
        />,
      ),
    );
    expect(await findByText('Review Import')).toBeTruthy();
    fireEvent.press(getByText('Save Recipe'));
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalled();
    });
  });
});
