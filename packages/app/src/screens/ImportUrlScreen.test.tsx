import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {AddStackParamList} from '../navigation/types';

import {ImportUrlScreen} from './ImportUrlScreen';

jest.mock('../lib/api');

const mockImportUrl = api.import.importUrl as jest.Mock;
const mockNavigate = jest.fn();
const stackProps = makeStackProps<AddStackParamList, 'ImportUrl'>(
  'ImportUrl',
  undefined,
  {navigate: mockNavigate},
);

describe('ImportUrlScreen', () => {
  test('does not import when URL is empty', async () => {
    const {getByText} = renderWithProviders(
      <ImportUrlScreen {...stackProps} />,
    );
    fireEvent.press(getByText('Import'));
    expect(mockImportUrl).not.toHaveBeenCalled();
  });

  test('imports URL and navigates to review', async () => {
    mockImportUrl.mockResolvedValue(makeRecipeDetail({id: 'imported-1'}));
    const {getByPlaceholderText, getByText} = renderWithProviders(
      <ImportUrlScreen {...stackProps} />,
    );
    fireEvent.changeText(
      getByPlaceholderText('https://example.com/recipe'),
      'https://example.com/recipe',
    );
    fireEvent.press(getByText('Import'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ImportReview', {
        recipeId: 'imported-1',
      });
    });
  });

  test('shows generic error on non-Error failure', async () => {
    mockImportUrl.mockRejectedValue('nope');
    const {getByPlaceholderText, getByText, findByText} = renderWithProviders(
      <ImportUrlScreen {...stackProps} />,
    );
    fireEvent.changeText(
      getByPlaceholderText('https://example.com/recipe'),
      'https://bad.com',
    );
    fireEvent.press(getByText('Import'));
    expect(await findByText('Import failed')).toBeTruthy();
  });

  test('shows error on failure', async () => {
    mockImportUrl.mockRejectedValue(new Error('Import failed'));
    const {getByPlaceholderText, getByText, findByText} = renderWithProviders(
      <ImportUrlScreen {...stackProps} />,
    );
    fireEvent.changeText(
      getByPlaceholderText('https://example.com/recipe'),
      'https://bad.com',
    );
    fireEvent.press(getByText('Import'));
    expect(await findByText('Import failed')).toBeTruthy();
  });
});
