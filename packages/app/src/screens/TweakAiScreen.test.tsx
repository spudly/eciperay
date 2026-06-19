import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {makeRecipeVersionSummary} from '../__tests__/fixtures/recipe';
import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

import {TweakAiScreen} from './TweakAiScreen';

jest.mock('../lib/api');

const mockTweakWithAi = api.versions.tweakWithAi as jest.Mock;
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const stackProps = makeStackProps<RecipesStackParamList, 'TweakAi'>(
  'TweakAi',
  {recipeId: 'recipe-uuid-1'},
  {navigate: mockNavigate, goBack: mockGoBack},
);

describe('TweakAiScreen', () => {
  test('submits prompt and navigates to edit version', async () => {
    mockTweakWithAi.mockResolvedValue({
      versionId: 'version-draft-1',
      version: makeRecipeVersionSummary({id: 'version-draft-1'}),
    });
    const {getByPlaceholderText, getByText} = renderWithProviders(
      <TweakAiScreen {...stackProps} />,
    );
    fireEvent.changeText(
      getByPlaceholderText(/make it vegetarian/i),
      'make it spicier',
    );
    fireEvent.press(getByText('Create draft'));
    await waitFor(() => {
      expect(mockTweakWithAi).toHaveBeenCalledWith(
        'recipe-uuid-1',
        'make it spicier',
      );
      expect(mockNavigate).toHaveBeenCalledWith('EditVersion', {
        recipeId: 'recipe-uuid-1',
        versionId: 'version-draft-1',
      });
    });
  });

  test('shows error on failure', async () => {
    mockTweakWithAi.mockRejectedValue(new Error('AI tweak failed'));
    const {getByPlaceholderText, getByText, findByText} = renderWithProviders(
      <TweakAiScreen {...stackProps} />,
    );
    fireEvent.changeText(
      getByPlaceholderText(/make it vegetarian/i),
      'make it spicier',
    );
    fireEvent.press(getByText('Create draft'));
    expect(await findByText('AI tweak failed')).toBeTruthy();
  });

  test('shows generic error for non-Error failures', async () => {
    mockTweakWithAi.mockRejectedValue('nope');
    const {getByPlaceholderText, getByText, findByText} = renderWithProviders(
      <TweakAiScreen {...stackProps} />,
    );
    fireEvent.changeText(
      getByPlaceholderText(/make it vegetarian/i),
      'make it spicier',
    );
    fireEvent.press(getByText('Create draft'));
    expect(await findByText('AI tweak failed')).toBeTruthy();
  });

  test('cancels and goes back', () => {
    const {getByText} = renderWithProviders(<TweakAiScreen {...stackProps} />);
    fireEvent.press(getByText('Cancel'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
