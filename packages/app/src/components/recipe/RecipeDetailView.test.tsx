import {useAuth, type RecipeDetailTab} from '@eciperay/client';
import type {RecipeDetail, RecipeVersionSummary} from '@eciperay/types';
import {fireEvent, waitFor} from '@testing-library/react-native';
import React, {useState} from 'react';

import {
  makeCookLog,
  makeRecipeDetail,
  makeRecipeVersionSummary,
  VERSION_ID,
} from '../../__tests__/fixtures/recipe';
import {makeQueryClient, renderWithProviders} from '../../__tests__/testUtils';
import {api} from '../../lib/api';

import {RecipeDetailView} from './RecipeDetailView';

jest.mock('../../lib/api');
jest.mock('@eciperay/client', () => ({
  ...jest.requireActual('@eciperay/client'),
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockPatchStatus = api.recipes.patchStatus as jest.Mock;
const mockPutRating = api.recipes.putRating as jest.Mock;
const mockCreateVersion = api.versions.create as jest.Mock;
const mockActivateVersion = api.versions.activate as jest.Mock;
const mockSubstitutions = api.ai.substitutions as jest.Mock;
const mockNutrition = api.ai.nutrition as jest.Mock;
const mockListCookLogs = api.cookLogs.list as jest.Mock;
const mockCreateCookLog = api.cookLogs.create as jest.Mock;
const mockListComments = api.recipes.listComments as jest.Mock;

type Callbacks = {
  onStartCooking: jest.Mock;
  onDelete: jest.Mock;
  onTweakAi: jest.Mock;
  onViewVersion: jest.Mock;
  onEditRecipe: jest.Mock;
  onEditVersion: jest.Mock;
  onSelectVersion: jest.Mock;
};

const makeCallbacks = (): Callbacks => ({
  onStartCooking: jest.fn(),
  onDelete: jest.fn(),
  onTweakAi: jest.fn(),
  onViewVersion: jest.fn(),
  onEditRecipe: jest.fn(),
  onEditVersion: jest.fn(),
  onSelectVersion: jest.fn(),
});

/**
 * The screen's stateful shell, minus its queries: tab, servings, and version
 * selection live here exactly as the screen holds them, so tab presses and
 * scaling flow through the view the way they do in the app.
 */
const Harness = ({
  recipe,
  versions,
  callbacks,
}: {
  recipe: RecipeDetail;
  versions: RecipeVersionSummary[];
  callbacks: Callbacks;
}) => {
  const [activeTab, setActiveTab] = useState<RecipeDetailTab>('overview');
  const [servings, setServings] = useState<number | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState(recipe.versionId);
  const displayRecipe =
    selectedVersionId === recipe.versionId
      ? recipe
      : {...recipe, versionId: selectedVersionId};
  const currentServings = servings ?? displayRecipe.servings;

  return (
    <RecipeDetailView
      recipe={recipe}
      displayRecipe={displayRecipe}
      versions={versions}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      selectedVersionId={selectedVersionId}
      onSelectVersion={versionId => {
        setSelectedVersionId(versionId);
        callbacks.onSelectVersion(versionId);
      }}
      currentServings={currentServings}
      scaleFactor={currentServings / displayRecipe.servings}
      onServingsChange={setServings}
      onStartCooking={callbacks.onStartCooking}
      onDelete={callbacks.onDelete}
      onTweakAi={callbacks.onTweakAi}
      onViewVersion={callbacks.onViewVersion}
      onEditRecipe={callbacks.onEditRecipe}
      onEditVersion={callbacks.onEditVersion}
    />
  );
};

const renderView = async (
  overrides: Partial<RecipeDetail> = {},
  versions: RecipeVersionSummary[] = [makeRecipeVersionSummary()],
) => {
  const callbacks = makeCallbacks();
  const recipe = makeRecipeDetail(overrides);
  const utils = await renderWithProviders(
    <Harness
      recipe={recipe}
      versions={versions}
      callbacks={callbacks}
    />,
    makeQueryClient(),
  );
  return {callbacks, recipe, ...utils};
};

const nutritionFixture = {
  satietyScore: 7,
  calories: 250,
  proteinG: 10,
  carbsG: 30,
  fatG: 8,
  fiberG: 4,
  sugarG: 5,
  sodiumMg: 500,
  preparedWeightG: 900,
  disclaimer: 'Estimate only',
};

describe('RecipeDetailView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      session: {user: {id: 'user-uuid-1', email: 'test@example.com'}},
    });
    mockListComments.mockResolvedValue([]);
    mockListCookLogs.mockResolvedValue([]);
    mockNutrition.mockResolvedValue(nutritionFixture);
    mockSubstitutions.mockResolvedValue([]);
    mockCreateVersion.mockResolvedValue(
      makeRecipeVersionSummary({id: 'version-draft-1'}),
    );
    mockActivateVersion.mockResolvedValue(undefined);
    mockPatchStatus.mockResolvedValue(undefined);
    mockPutRating.mockResolvedValue({});
    mockCreateCookLog.mockResolvedValue({});
  });

  test('renders the overview mapping: stats, chips, lifecycle, engagement', async () => {
    const {findByText, queryByText} = await renderView();
    expect(await findByText('Test Recipe')).toBeTruthy();
    expect(await findByText('Servings')).toBeTruthy();
    expect(await findByText('15m')).toBeTruthy();
    expect(await findByText('30m')).toBeTruthy();
    expect(await findByText('Start Cooking')).toBeTruthy();
    expect(await findByText('Edit')).toBeTruthy();
    expect(await findByText('Delete')).toBeTruthy();
    expect(await findByText('Tweak manually')).toBeTruthy();
    expect(await findByText('Tweak with AI')).toBeTruthy();
    expect(await findByText('Mark perfected')).toBeTruthy();
    expect(await findByText('Abandon')).toBeTruthy();
    expect(await findByText('Sharing')).toBeTruthy();
    expect(await findByText('No community ratings yet')).toBeTruthy();
    expect(await findByText('Comments')).toBeTruthy();
    // The default fixture's version is not an editable draft.
    expect(queryByText('Edit draft')).toBeNull();
  });

  test('routes the overview action chips to the screen callbacks', async () => {
    const {callbacks, findByText, getByLabelText} = await renderView();
    await fireEvent.press(await findByText('Start Cooking'));
    expect(callbacks.onStartCooking).toHaveBeenCalledTimes(1);
    await fireEvent.press(await findByText('Edit'));
    expect(callbacks.onEditRecipe).toHaveBeenCalledTimes(1);
    await fireEvent.press(await findByText('Delete'));
    expect(callbacks.onDelete).toHaveBeenCalledTimes(1);
    await fireEvent.press(await findByText('Tweak with AI'));
    expect(callbacks.onTweakAi).toHaveBeenCalledTimes(1);
    expect(getByLabelText('Print recipe')).toBeTruthy();
    expect(getByLabelText('Share recipe')).toBeTruthy();
  });

  test('tweak manually creates a version and hands it to onViewVersion', async () => {
    const {callbacks, recipe, findByText} = await renderView();
    await fireEvent.press(await findByText('Tweak manually'));
    await waitFor(() => {
      expect(mockCreateVersion).toHaveBeenCalledWith(recipe.id);
    });
    await waitFor(() => {
      expect(callbacks.onViewVersion).toHaveBeenCalledWith('version-draft-1');
    });
  });

  test('mark perfected patches the recipe status', async () => {
    const {recipe, findByText} = await renderView();
    await fireEvent.press(await findByText('Mark perfected'));
    await waitFor(() => {
      expect(mockPatchStatus).toHaveBeenCalledWith(recipe.id, 'perfected');
    });
  });

  test('activates a candidate version and shows the action message', async () => {
    const candidate = makeRecipeVersionSummary({
      id: 'version-candidate-1',
      versionNumber: 2,
      derivedRole: 'candidate',
      changeSummary: 'Better crust',
    });
    const {recipe, findByText} = await renderView({}, [
      makeRecipeVersionSummary(),
      candidate,
    ]);
    expect(await findByText('Ready to activate')).toBeTruthy();
    expect(await findByText('v2: Better crust')).toBeTruthy();
    await fireEvent.press(await findByText('Activate'));
    await waitFor(() => {
      expect(mockActivateVersion).toHaveBeenCalledWith(
        recipe.id,
        'version-candidate-1',
      );
    });
    expect(await findByText('Version activated')).toBeTruthy();
  });

  test('hides the lifecycle section for a perfected recipe', async () => {
    const {findByText, queryByText} = await renderView({status: 'perfected'});
    expect(await findByText('Test Recipe')).toBeTruthy();
    expect(queryByText('Tweak manually')).toBeNull();
    expect(queryByText('Tweak with AI')).toBeNull();
  });

  test('maps the community rating and sends viewer stars to the mutation', async () => {
    const {recipe, findByText, getByLabelText} = await renderView({
      communityRating: {average: 4.6, count: 9, hasStaleRatings: false},
    });
    expect(await findByText('4.6 (9)')).toBeTruthy();
    expect(await findByText('Your rating')).toBeTruthy();
    await fireEvent.press(getByLabelText('Rate 4 out of 5 stars'));
    await waitFor(() => {
      expect(mockPutRating).toHaveBeenCalledWith(recipe.id, {stars: 4});
    });
  });

  test('hides the viewer rating input when signed out', async () => {
    mockUseAuth.mockReturnValue({session: null});
    const {findByText, queryByText} = await renderView();
    expect(await findByText('No community ratings yet')).toBeTruthy();
    expect(queryByText('Your rating')).toBeNull();
  });

  test('selects a version from the picker sheet', async () => {
    const archived = makeRecipeVersionSummary({
      id: 'version-uuid-2',
      versionNumber: 2,
      derivedRole: 'archived',
    });
    const {callbacks, findByText, getByLabelText} = await renderView({}, [
      makeRecipeVersionSummary(),
      archived,
    ]);
    await findByText('Test Recipe');
    await fireEvent.press(getByLabelText('Select version'));
    await fireEvent.press(await findByText(/v2 — Archived/));
    expect(callbacks.onSelectVersion).toHaveBeenCalledWith('version-uuid-2');
  });

  test('scales ingredients and runs the substitutions flow', async () => {
    mockSubstitutions.mockResolvedValue([
      {ingredient: 'Flour', suggestions: ['Rice flour', 'Oat flour']},
    ]);
    const {findByText, queryByText} = await renderView();
    await fireEvent.press(await findByText('Ingredients'));
    expect(await findByText('2 cups Flour')).toBeTruthy();
    await fireEvent.press(await findByText('2×'));
    expect(await findByText('4 cups Flour')).toBeTruthy();
    await fireEvent.press(await findByText('4 cups Flour'));
    expect(await findByText('Substitutions')).toBeTruthy();
    expect(await findByText('Rice flour, Oat flour')).toBeTruthy();
    expect(
      await findByText(
        'Tap an ingredient to mark it missing and see substitutions below.',
      ),
    ).toBeTruthy();
    // Leaving the tab resets the missing set, as the unmounted tab did.
    await fireEvent.press(await findByText('Overview'));
    await fireEvent.press(await findByText('Ingredients'));
    expect(await findByText('4 cups Flour')).toBeTruthy();
    expect(queryByText('Substitutions')).toBeNull();
  });

  test('renders the instruction steps', async () => {
    const {findByText} = await renderView();
    await fireEvent.press(await findByText('Instructions'));
    expect(await findByText('Mix dry ingredients')).toBeTruthy();
    expect(await findByText('Bake at 350°F')).toBeTruthy();
  });

  test('swaps the cook-log form for the button and saves through it', async () => {
    mockListCookLogs.mockResolvedValue([makeCookLog()]);
    const {recipe, findByText, queryByText} = await renderView();
    await fireEvent.press(await findByText('Cook History'));
    expect(await findByText('Turned out great')).toBeTruthy();
    await fireEvent.press(await findByText('Log a cook'));
    expect(await findByText('How did it go?')).toBeTruthy();
    expect(queryByText('Log a cook')).toBeNull();
    await fireEvent.press(await findByText('Save'));
    await waitFor(() => {
      expect(mockCreateCookLog).toHaveBeenCalledWith(recipe.id, VERSION_ID, {
        authorStarRating: null,
        notes: null,
      });
    });
  });

  test('closes the cook-log form when leaving the history tab', async () => {
    const {findByText, queryByText} = await renderView();
    await fireEvent.press(await findByText('Cook History'));
    await fireEvent.press(await findByText('Log a cook'));
    expect(await findByText('How did it go?')).toBeTruthy();
    await fireEvent.press(await findByText('Overview'));
    await fireEvent.press(await findByText('Cook History'));
    expect(await findByText('Log a cook')).toBeTruthy();
    expect(queryByText('How did it go?')).toBeNull();
  });

  test('renders nutrition rows and refreshes the estimate', async () => {
    const {recipe, findByText} = await renderView();
    await fireEvent.press(await findByText('Nutrition'));
    expect(await findByText('Per Serving')).toBeTruthy();
    expect(await findByText('250')).toBeTruthy();
    expect(await findByText('10g')).toBeTruthy();
    await fireEvent.press(await findByText('Refresh'));
    await waitFor(() => {
      expect(mockNutrition).toHaveBeenCalledWith(recipe.id, {refresh: true});
    });
  });

  test('renders the nutrition unavailable state with an estimate action', async () => {
    mockNutrition.mockResolvedValue(null);
    const {recipe, findByText} = await renderView();
    await fireEvent.press(await findByText('Nutrition'));
    expect(await findByText('Nutrition is not available yet.')).toBeTruthy();
    await fireEvent.press(await findByText('Estimate nutrition'));
    await waitFor(() => {
      expect(mockNutrition).toHaveBeenCalledWith(recipe.id, {refresh: true});
    });
  });
});
