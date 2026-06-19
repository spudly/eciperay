import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {AddStackParamList} from '../navigation/types';

import {GenerateAiScreen} from './GenerateAiScreen';

jest.mock('../lib/api');

const mockImportAi = api.import.importAi as jest.Mock;
const mockNavigate = jest.fn();
const stackProps = makeStackProps<AddStackParamList, 'GenerateAi'>(
  'GenerateAi',
  undefined,
  {navigate: mockNavigate},
);

describe('GenerateAiScreen', () => {
  test('does not generate when prompt is empty', async () => {
    const {getByText} = renderWithProviders(
      <GenerateAiScreen {...stackProps} />,
    );
    fireEvent.press(getByText('Generate recipe'));
    expect(mockImportAi).not.toHaveBeenCalled();
  });

  test('generates a recipe and navigates to review', async () => {
    mockImportAi.mockResolvedValue(makeRecipeDetail({id: 'recipe-ai-1'}));
    const {getByPlaceholderText, getByText} = renderWithProviders(
      <GenerateAiScreen {...stackProps} />,
    );
    fireEvent.changeText(
      getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    fireEvent.press(getByText('Generate recipe'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ImportReview', {
        recipeId: 'recipe-ai-1',
      });
    });
    expect(mockImportAi).toHaveBeenCalledWith(
      'simple chocolate chip cookies for 12',
    );
  });

  test('shows generic error on non-Error failure', async () => {
    mockImportAi.mockRejectedValue('nope');
    const {getByPlaceholderText, getByText, findByText} = renderWithProviders(
      <GenerateAiScreen {...stackProps} />,
    );
    fireEvent.changeText(
      getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    fireEvent.press(getByText('Generate recipe'));
    expect(await findByText('Recipe generation failed')).toBeTruthy();
  });

  test('shows error on failure', async () => {
    mockImportAi.mockRejectedValue(new Error('Generation failed'));
    const {getByPlaceholderText, getByText, findByText} = renderWithProviders(
      <GenerateAiScreen {...stackProps} />,
    );
    fireEvent.changeText(
      getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    fireEvent.press(getByText('Generate recipe'));
    expect(await findByText('Generation failed')).toBeTruthy();
  });
});
