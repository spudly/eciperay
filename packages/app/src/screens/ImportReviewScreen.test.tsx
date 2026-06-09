import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {AddStackParamList} from '../navigation/types';

import {ImportReviewScreen} from './ImportReviewScreen';

jest.mock('../lib/api');

const mockGet = api.recipes.get as jest.Mock;
const mockPut = api.recipes.put as jest.Mock;
const mockListTags = api.tags.list as jest.Mock;
const mockGetParent = jest.fn().mockReturnValue({navigate: jest.fn()});
const stackProps = makeStackProps<AddStackParamList, 'ImportReview'>(
  'ImportReview',
  {recipeId: 'recipe-uuid-1'},
  {getParent: mockGetParent},
);

describe('ImportReviewScreen', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue(makeRecipeDetail());
    mockPut.mockResolvedValue(makeRecipeDetail());
    mockListTags.mockResolvedValue([]);
  });

  test('loads recipe and saves on submit', async () => {
    const {findByText, getByText} = render(
      renderWithProviders(<ImportReviewScreen {...stackProps} />),
    );
    expect(await findByText('Review Import')).toBeTruthy();
    fireEvent.press(getByText('Save Recipe'));
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalled();
    });
  });
});
