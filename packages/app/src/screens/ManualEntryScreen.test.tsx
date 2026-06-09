import {queryKeys} from '@recipoo/client';
import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {
  makeQueryClient,
  makeStackProps,
  renderWithProviders,
} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {AddStackParamList} from '../navigation/types';

import {ManualEntryScreen} from './ManualEntryScreen';

jest.mock('../lib/api');

const mockCreate = api.recipes.create as jest.Mock;
const mockListTags = api.tags.list as jest.Mock;
const mockGetParent = jest.fn().mockReturnValue({navigate: jest.fn()});
const stackProps = makeStackProps<AddStackParamList, 'ManualEntry'>(
  'ManualEntry',
  undefined,
  {getParent: mockGetParent},
);

describe('ManualEntryScreen', () => {
  beforeEach(() => {
    mockListTags.mockResolvedValue([]);
  });

  test('creates recipe on submit', async () => {
    mockCreate.mockResolvedValue(makeRecipeDetail({id: 'new-id'}));
    const queryClient = makeQueryClient();
    await queryClient.prefetchQuery({
      queryKey: queryKeys.tags(),
      queryFn: () => mockListTags(),
    });
    const {getAllByPlaceholderText, getByText} = render(
      renderWithProviders(<ManualEntryScreen {...stackProps} />, queryClient),
    );
    const inputs = getAllByPlaceholderText('Name');
    fireEvent.changeText(inputs[0], 'Flour');
    fireEvent.press(getByText('Create Recipe'));
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });
  });
});
