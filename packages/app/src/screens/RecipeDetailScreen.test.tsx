import React from 'react';
import {Alert, Linking} from 'react-native';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {
  makeCookLog,
  makeRecipeDetail,
  makeRecipeVersionDetail,
  makeRecipeVersionSummary,
  VERSION_ID,
} from '../__tests__/fixtures/recipe';
import {
  makeStackProps,
  makeQueryClient,
  flushQueryClient,
  renderWithProviders,
} from '../__tests__/testUtils';
import {api} from '../lib/api';
import {
  recipeCookHref,
  recipeEditHref,
  recipeTweakAiHref,
  recipeVersionEditHref,
} from '../lib/deepLinks';
import type {RecipesStackParamList} from '../navigation/types';

import {RecipeDetailScreen} from './RecipeDetailScreen';

jest.mock('../lib/api');

const mockGet = api.recipes.get as jest.Mock;
const mockDelete = api.recipes.delete as jest.Mock;
const mockListVersions = api.versions.list as jest.Mock;
const mockGetVersion = api.versions.get as jest.Mock;
const mockCreateVersion = api.versions.create as jest.Mock;
const mockNutrition = api.ai.nutrition as jest.Mock;
const mockListCookLogs = api.cookLogs.list as jest.Mock;
const mockNavigate = jest.fn();
const stackProps = makeStackProps<RecipesStackParamList, 'RecipeDetail'>(
  'RecipeDetail',
  {recipeId: 'recipe-uuid-1'},
  {navigate: mockNavigate},
);

describe('RecipeDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue(makeRecipeDetail());
    mockDelete.mockImplementation(async () => {});
    mockListVersions.mockResolvedValue([makeRecipeVersionSummary()]);
    mockNutrition.mockResolvedValue({
      calories: 250,
      proteinG: 10,
      carbsG: 30,
      fatG: 8,
      fiberG: 4,
      sodiumMg: 500,
      disclaimer: 'Estimate only',
    });
    mockListCookLogs.mockResolvedValue([]);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  test('renders recipe title in overview tab', async () => {
    const {findByText} = await renderWithProviders(
      <RecipeDetailScreen {...stackProps} />,
    );
    expect(await findByText('Test Recipe')).toBeTruthy();
  });

  test('switches to ingredients tab', async () => {
    const {findByText} = await renderWithProviders(
      <RecipeDetailScreen {...stackProps} />,
    );
    await findByText('Test Recipe');
    await fireEvent.press(await findByText('Ingredients'));
    expect(await findByText(/Flour/)).toBeTruthy();
  });

  // The overview's navigation actions are deep-link hrefs now
  // (#248): a press opens the URL through Linking and the
  // container's linking config routes it to the same screens (the
  // cooking link's query params arrive as its route params).
  test('opens the cooking-mode deep link with versionId and servings', async () => {
    const {findByText} = await renderWithProviders(
      <RecipeDetailScreen {...stackProps} />,
    );
    await fireEvent.press(await findByText('Start Cooking'));
    expect(Linking.openURL).toHaveBeenCalledWith(
      recipeCookHref('recipe-uuid-1', VERSION_ID, 4),
    );
  });

  test('passes scaled servings to the cooking-mode deep link', async () => {
    const {findByText, getByText} = await renderWithProviders(
      <RecipeDetailScreen {...stackProps} />,
    );
    await findByText('Test Recipe');
    await fireEvent.press(getByText('Ingredients'));
    await fireEvent.press(await findByText('2×'));
    // No return trip to an overview tab: the single-scroll page keeps
    // every section mounted, so Start Cooking is already on screen.
    await fireEvent.press(await findByText('Start Cooking'));
    expect(Linking.openURL).toHaveBeenCalledWith(
      recipeCookHref('recipe-uuid-1', VERSION_ID, 8),
    );
  });

  test('opens the edit-recipe deep link for active versions', async () => {
    const {findByText} = await renderWithProviders(
      <RecipeDetailScreen {...stackProps} />,
    );
    await fireEvent.press(await findByText('Edit'));
    expect(Linking.openURL).toHaveBeenCalledWith(
      recipeEditHref('recipe-uuid-1'),
    );
  });

  test('opens the edit-draft deep link for an existing draft', async () => {
    const draftId = 'version-draft-1';
    mockListVersions.mockResolvedValue([
      makeRecipeVersionSummary(),
      makeRecipeVersionSummary({
        id: draftId,
        versionNumber: 2,
        derivedRole: 'draft',
        isEditable: true,
      }),
    ]);
    mockGetVersion.mockResolvedValue(
      makeRecipeVersionDetail({
        id: draftId,
        versionNumber: 2,
        derivedRole: 'draft',
        isEditable: true,
      }),
    );
    const routeParams: RecipesStackParamList['RecipeDetail'] = {
      recipeId: 'recipe-uuid-1',
      versionId: draftId,
    };
    const mockSetParams = jest.fn(
      (updates: Partial<RecipesStackParamList['RecipeDetail']>) => {
        Object.assign(routeParams, updates);
      },
    );
    const client = makeQueryClient();
    const draftProps = makeStackProps<RecipesStackParamList, 'RecipeDetail'>(
      'RecipeDetail',
      routeParams,
      {navigate: mockNavigate, setParams: mockSetParams},
    );
    const {findByText} = await renderWithProviders(
      <RecipeDetailScreen {...draftProps} />,
      client,
    );
    await flushQueryClient(client);
    await waitFor(
      () => {
        expect(mockGetVersion).toHaveBeenCalledWith('recipe-uuid-1', draftId);
      },
      {timeout: 5000},
    );
    await fireEvent.press(await findByText('Edit draft'));
    expect(Linking.openURL).toHaveBeenCalledWith(
      recipeVersionEditHref('recipe-uuid-1', draftId),
    );
  });

  test('switches to instructions, cook history, and nutrition tabs', async () => {
    mockListCookLogs.mockResolvedValue([makeCookLog()]);
    const {findByText} = await renderWithProviders(
      <RecipeDetailScreen {...stackProps} />,
    );
    await findByText('Test Recipe');
    await fireEvent.press(await findByText('Instructions'));
    expect(await findByText('Mix dry ingredients')).toBeTruthy();
    await fireEvent.press(await findByText('Cook History'));
    expect(await findByText('Turned out great')).toBeTruthy();
    await fireEvent.press(await findByText('Nutrition'));
    expect(await findByText('250')).toBeTruthy();
  });

  test('deletes recipe from overview', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.[1]?.onPress?.();
    });
    const {findByText} = await renderWithProviders(
      <RecipeDetailScreen {...stackProps} />,
    );
    await fireEvent.press(await findByText('Delete'));
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  test('loads alternate version when selected in picker', async () => {
    const alternateVersionId = 'version-uuid-2';
    mockListVersions.mockResolvedValue([
      makeRecipeVersionSummary(),
      makeRecipeVersionSummary({
        id: alternateVersionId,
        versionNumber: 2,
        derivedRole: 'archived',
      }),
    ]);
    mockGetVersion.mockResolvedValue(
      makeRecipeVersionDetail({
        id: alternateVersionId,
        versionNumber: 2,
        title: 'Archived Recipe',
        derivedRole: 'archived',
      }),
    );
    const {findByText, getByText} = await renderWithProviders(
      <RecipeDetailScreen {...stackProps} />,
    );
    await findByText('Test Recipe');
    await fireEvent.press(await findByText(/v1 — Active/));
    await fireEvent.press(getByText(/v2/));
    expect(await findByText('Archived Recipe')).toBeTruthy();
    expect(mockGetVersion).toHaveBeenCalledWith(
      'recipe-uuid-1',
      alternateVersionId,
    );
  });

  test('opens the tweak-AI deep link and keeps the tweak-manually flow', async () => {
    mockCreateVersion.mockResolvedValue(
      makeRecipeVersionSummary({id: 'version-draft-1'}),
    );
    const {findByText} = await renderWithProviders(
      <RecipeDetailScreen {...stackProps} />,
    );
    await fireEvent.press(await findByText('Tweak with AI'));
    expect(Linking.openURL).toHaveBeenCalledWith(
      recipeTweakAiHref('recipe-uuid-1'),
    );
    await fireEvent.press(await findByText('Tweak manually'));
    await waitFor(() => {
      expect(mockCreateVersion).toHaveBeenCalled();
    });
  });
});
