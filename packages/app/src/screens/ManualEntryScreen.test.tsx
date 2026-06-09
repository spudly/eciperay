import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';

import {ManualEntryScreen} from './ManualEntryScreen';

jest.mock('../lib/api');

const mockCreate = api.recipes.create as jest.Mock;
const mockGetParent = jest.fn().mockReturnValue({navigate: jest.fn()});
const navigation = {getParent: mockGetParent} as never;

describe('ManualEntryScreen', () => {
  test('creates recipe on submit', async () => {
    mockCreate.mockResolvedValue(makeRecipeDetail({id: 'new-id'}));
    const {getAllByPlaceholderText, getByText} = render(
      renderWithProviders(<ManualEntryScreen navigation={navigation} />),
    );
    const inputs = getAllByPlaceholderText('Name');
    fireEvent.changeText(inputs[0], 'Flour');
    fireEvent.press(getByText('Create Recipe'));
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });
  });
});
