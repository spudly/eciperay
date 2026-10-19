import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {
  makeCookLog,
  makeRecipeDetail,
  makeRecipeVersionDetail,
  VERSION_ID,
} from '../__tests__/fixtures/recipe';
import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

import {CookingModeScreen} from './CookingModeScreen';

jest.mock('../lib/api');

const mockGet = api.recipes.get as jest.Mock;
const mockGetVersion = api.versions.get as jest.Mock;
const mockCreateCookLog = api.cookLogs.create as jest.Mock;
const mockGoBack = jest.fn();
const stackProps = makeStackProps<RecipesStackParamList, 'CookingMode'>(
  'CookingMode',
  {recipeId: 'recipe-uuid-1', versionId: VERSION_ID},
  {goBack: mockGoBack},
);

describe('CookingModeScreen', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue(makeRecipeDetail());
    mockCreateCookLog.mockResolvedValue(makeCookLog());
  });

  test('renders first instruction step', async () => {
    const {findByText} = await renderWithProviders(
      <CookingModeScreen {...stackProps} />,
    );
    expect(await findByText('Mix dry ingredients')).toBeTruthy();
  });

  test('uses recipe version when versionId param is omitted', async () => {
    const propsWithoutVersion = makeStackProps<
      RecipesStackParamList,
      'CookingMode'
    >('CookingMode', {recipeId: 'recipe-uuid-1'}, {goBack: mockGoBack});
    const {findByText} = await renderWithProviders(
      <CookingModeScreen {...propsWithoutVersion} />,
    );
    expect(await findByText('Mix dry ingredients')).toBeTruthy();
  });

  test('advances to next step', async () => {
    const {findByText} = await renderWithProviders(
      <CookingModeScreen {...stackProps} />,
    );
    await findByText('Mix dry ingredients');
    await fireEvent.press(await findByText('Next →'));
    expect(await findByText('Bake at 350°F')).toBeTruthy();
  });

  test('goes to previous step', async () => {
    const {findByText} = await renderWithProviders(
      <CookingModeScreen {...stackProps} />,
    );
    await findByText('Mix dry ingredients');
    await fireEvent.press(await findByText('Next →'));
    await fireEvent.press(await findByText('← Back'));
    expect(await findByText('Mix dry ingredients')).toBeTruthy();
  });

  test('shows scaled ingredients when servings are provided', async () => {
    const scaledProps = makeStackProps<RecipesStackParamList, 'CookingMode'>(
      'CookingMode',
      {recipeId: 'recipe-uuid-1', versionId: VERSION_ID, servings: 8},
      {goBack: mockGoBack},
    );
    const {findByText} = await renderWithProviders(
      <CookingModeScreen {...scaledProps} />,
    );
    expect(await findByText('4 cups Flour')).toBeTruthy();
    expect(await findByText(/scaled to 8 servings/)).toBeTruthy();
  });

  test('shows cook log form on Done press', async () => {
    const {findByText} = await renderWithProviders(
      <CookingModeScreen {...stackProps} />,
    );
    await fireEvent.press(await findByText('Done'));
    expect(await findByText('How did it go?')).toBeTruthy();
  });

  test('skips cook log and goes back', async () => {
    const {findByText} = await renderWithProviders(
      <CookingModeScreen {...stackProps} />,
    );
    await fireEvent.press(await findByText('Done'));
    await fireEvent.press(await findByText('Skip'));
    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  test('saves cook log and goes back', async () => {
    const {findByText} = await renderWithProviders(
      <CookingModeScreen {...stackProps} />,
    );
    await fireEvent.press(await findByText('Done'));
    await fireEvent.press(await findByText('Save'));
    await waitFor(() => {
      expect(mockCreateCookLog).toHaveBeenCalledWith(
        'recipe-uuid-1',
        VERSION_ID,
        expect.objectContaining({notes: null}),
      );
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  test('loads alternate version instructions when version differs', async () => {
    const alternateVersionId = 'version-uuid-2';
    mockGetVersion.mockResolvedValue(
      makeRecipeVersionDetail({
        id: alternateVersionId,
        instructions: [
          {
            id: 's-1',
            recipeVersionId: alternateVersionId,
            stepNumber: 1,
            body: 'Alternate step',
            estimatedDurationMin: null,
          },
        ],
      }),
    );
    const alternateProps = makeStackProps<RecipesStackParamList, 'CookingMode'>(
      'CookingMode',
      {recipeId: 'recipe-uuid-1', versionId: alternateVersionId},
      {goBack: mockGoBack},
    );
    const {findByText} = await renderWithProviders(
      <CookingModeScreen {...alternateProps} />,
    );
    expect(await findByText('Alternate step')).toBeTruthy();
    expect(mockGetVersion).toHaveBeenCalledWith(
      'recipe-uuid-1',
      alternateVersionId,
    );
  });
});
