import {queryKeys, uploadRecipeImageFromBase64} from '@eciperay/client';
import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {
  makeQueryClient,
  makeStackProps,
  renderWithProviders,
} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {AddStackParamList} from '../navigation/types';

import {ManualEntryScreen} from './ManualEntryScreen';

jest.mock('../lib/api', () => ({
  api: {
    recipes: {create: jest.fn(), put: jest.fn()},
    tags: {list: jest.fn()},
    ai: {
      generateImage: jest
        .fn()
        .mockResolvedValue({
          imageBase64: btoa('pixels'),
          contentType: 'image/png',
        }),
      generateDescription: jest.fn(),
    },
  },
}));
jest.mock('../lib/supabase', () => ({supabase: {}}));

const mockUseAuth = jest.fn(() => ({
  session: {user: {id: 'user-1'}},
  isLoading: false,
}));

jest.mock('@eciperay/client', () => {
  const actual = jest.requireActual('@eciperay/client');
  return {
    ...actual,
    useAuth: () => mockUseAuth(),
    uploadRecipeImageFromBase64: jest
      .fn()
      .mockResolvedValue('https://cdn.example/recipe.png'),
  };
});

const mockCreate = api.recipes.create as jest.Mock;
const mockPut = api.recipes.put as jest.Mock;
const mockListTags = api.tags.list as jest.Mock;
const mockUploadRecipeImageFromBase64 =
  uploadRecipeImageFromBase64 as jest.Mock;
const mockGetParent = jest.fn().mockReturnValue({navigate: jest.fn()});
const stackProps = makeStackProps<AddStackParamList, 'ManualEntry'>(
  'ManualEntry',
  undefined,
  {getParent: mockGetParent},
);

describe('ManualEntryScreen', () => {
  beforeEach(() => {
    mockListTags.mockResolvedValue([]);
    mockPut.mockResolvedValue(makeRecipeDetail({id: 'new-id'}));
    mockUploadRecipeImageFromBase64.mockResolvedValue(
      'https://cdn.example/recipe.png',
    );
  });

  test('creates recipe on submit', async () => {
    mockCreate.mockResolvedValue({
      ...makeRecipeDetail({id: 'new-id'}),
      recipeId: 'new-id',
    });
    const queryClient = makeQueryClient();
    await queryClient.prefetchQuery({
      queryKey: queryKeys.tags(),
      queryFn: () => mockListTags(),
    });
    const {getAllByPlaceholderText, getByText} = renderWithProviders(
      <ManualEntryScreen {...stackProps} />,
      queryClient,
    );
    const inputs = getAllByPlaceholderText('Name');
    fireEvent.changeText(inputs[0], 'Flour');
    fireEvent.press(getByText('Create Recipe'));
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  test('uploads a pending image after the recipe is created', async () => {
    mockCreate.mockResolvedValue({
      ...makeRecipeDetail({id: 'new-id'}),
      recipeId: 'new-id',
    });
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await queryClient.prefetchQuery({
      queryKey: queryKeys.tags(),
      queryFn: () => mockListTags(),
    });
    const {getByLabelText, getByText} = renderWithProviders(
      <ManualEntryScreen {...stackProps} />,
      queryClient,
    );
    fireEvent.changeText(getByLabelText('Title'), 'New Recipe');
    fireEvent.press(getByLabelText('Generate image with AI'));
    await waitFor(() => {
      expect(mockUploadRecipeImageFromBase64).not.toHaveBeenCalled();
    });
    fireEvent.press(getByText('Create Recipe'));
    await waitFor(() => {
      expect(mockUploadRecipeImageFromBase64).toHaveBeenCalledWith(
        expect.anything(),
        btoa('pixels'),
        'image/png',
        {userId: 'user-1', recipeId: 'new-id'},
      );
    });
    expect(mockPut).toHaveBeenCalledWith(
      'new-id',
      expect.objectContaining({
        imageUrl: 'https://cdn.example/recipe.png',
        title: 'New Recipe',
        servings: 4,
      }),
    );
    expect(invalidateSpy).toHaveBeenCalled();
  });
});
