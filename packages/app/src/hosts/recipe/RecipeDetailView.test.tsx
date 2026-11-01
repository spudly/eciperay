import {useAuth} from '@eciperay/client';
import type {RecipeDetail, RecipeVersionSummary} from '@eciperay/types';
import {fireEvent, userEvent, waitFor} from '@testing-library/react-native';
import React, {useState} from 'react';
import {Linking} from 'react-native';

import {
  makeCookLog,
  makeRecipeDetail,
  makeRecipeVersionSummary,
  VERSION_ID,
} from '../../__tests__/fixtures/recipe';
import {makeQueryClient, renderWithProviders} from '../../__tests__/testUtils';
import {api} from '../../lib/api';
import {
  recipeCookHref,
  recipeEditHref,
  recipeTweakAiHref,
} from '../../lib/deepLinks';

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

// The view's remaining screen callbacks: navigation left the prop
// surface with @spudly/ui 1.15.0 (#248) — the overview's navigation
// actions are hrefs the view composes itself — so only the true
// actions (delete, create-a-draft's editor landing) and the
// view-state callbacks remain.
type Callbacks = {
  onDelete: jest.Mock;
  onViewVersion: jest.Mock;
  onSelectVersion: jest.Mock;
  onEditVersion: jest.Mock;
};

const makeCallbacks = (): Callbacks => ({
  onDelete: jest.fn(),
  onViewVersion: jest.fn(),
  onSelectVersion: jest.fn(),
  onEditVersion: jest.fn(),
});

/**
 * The screen's stateful shell, minus its queries: servings and version
 * selection live here exactly as the screen holds them, so version switches and
 * scaling flow through the view the way they do in the app.
 */
const Harness = ({
  recipe,
  versions,
  callbacks,
  initialServings,
}: {
  recipe: RecipeDetail;
  versions: RecipeVersionSummary[];
  callbacks: Callbacks;
  initialServings?: number;
}) => {
  const [servings, setServings] = useState<number | null>(
    initialServings ?? null,
  );
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
      selectedVersionId={selectedVersionId}
      onSelectVersion={versionId => {
        setSelectedVersionId(versionId);
        callbacks.onSelectVersion(versionId);
      }}
      currentServings={currentServings}
      scaleFactor={currentServings / displayRecipe.servings}
      onServingsChange={setServings}
      onDelete={callbacks.onDelete}
      onViewVersion={callbacks.onViewVersion}
      onEditVersion={callbacks.onEditVersion}
    />
  );
};

const renderView = async (
  overrides: Partial<RecipeDetail> = {},
  versions: RecipeVersionSummary[] = [makeRecipeVersionSummary()],
  initialServings?: number,
) => {
  const callbacks = makeCallbacks();
  const recipe = makeRecipeDetail(overrides);
  const utils = await renderWithProviders(
    <Harness
      recipe={recipe}
      versions={versions}
      callbacks={callbacks}
      initialServings={initialServings}
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

/**
 * The scale presets are toggle Buttons since the chips retired: the selection
 * reads from the pressable ancestor's accessibility state (the label queries
 * the retired ToggleChip answered to are gone).
 */
const scaleSelected = (
  utils: {getByText: (text: string) => {parent: unknown}},
  label: string,
): boolean | undefined => {
  // The toggle Button's frame (role "button") is the first ancestor
  // carrying the selected state; Tamagui's press handling does not
  // surface as an onPress prop in the host tree.
  let node = utils.getByText(label) as {
    parent: typeof node;
    props: {
      accessibilityRole?: string;
      accessibilityState?: {selected?: boolean};
    };
  } | null;
  while (node && node.props.accessibilityRole !== 'button') {
    node = node.parent;
  }
  return node?.props.accessibilityState?.selected;
};

describe('RecipeDetailView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
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
    const {findByText, queryByText, getAllByText} = await renderView();
    expect(await findByText('Test Recipe')).toBeTruthy();
    // The single-scroll page shows the label twice: the overview stat and
    // the ingredients section's servings control.
    expect(getAllByText('Servings').length).toBeGreaterThan(0);
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

  test('routes the overview actions: hrefs open deep links, actions stay callbacks', async () => {
    const {callbacks, recipe, findByText, getByLabelText} = await renderView();
    await fireEvent.press(await findByText('Start Cooking'));
    expect(Linking.openURL).toHaveBeenCalledWith(
      recipeCookHref(recipe.id, recipe.versionId, recipe.servings),
    );
    await fireEvent.press(await findByText('Edit'));
    expect(Linking.openURL).toHaveBeenCalledWith(recipeEditHref(recipe.id));
    await fireEvent.press(await findByText('Delete'));
    expect(callbacks.onDelete).toHaveBeenCalledTimes(1);
    await fireEvent.press(await findByText('Tweak with AI'));
    expect(Linking.openURL).toHaveBeenCalledWith(recipeTweakAiHref(recipe.id));
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

  test('perfected recipe: Edit draft chip creates a draft and opens it in the editor (#264)', async () => {
    // The #264 flow (the chip creates a draft, then opens it) is a
    // mutation-then-navigate control; @spudly/ui 1.16.0 carries it as
    // the onCreateDraftPress slot (design-system#357), rendered as
    // the "Edit draft" button when no existing draft's editDraftHref
    // is passed. (1.15.0 had no slot and the wiring was removed;
    // opening an existing draft kept working through the href — the
    // screen test covers it end to end.)
    const {callbacks, recipe, findByText} = await renderView({
      status: 'perfected',
    });
    expect(await findByText('Test Recipe')).toBeTruthy();
    await fireEvent.press(await findByText('Edit draft'));
    await waitFor(() => {
      expect(mockCreateVersion).toHaveBeenCalledWith(recipe.id);
    });
    await waitFor(() => {
      expect(callbacks.onEditVersion).toHaveBeenCalledWith('version-draft-1');
    });
  });

  test('perfected recipe: a failed draft creation shows feedback and does not navigate (#264)', async () => {
    mockCreateVersion.mockRejectedValue(new Error('Server exploded'));
    const {callbacks, findByText} = await renderView({status: 'perfected'});
    await fireEvent.press(await findByText('Edit draft'));
    expect(
      await findByText('Could not create a draft. Please try again.'),
    ).toBeTruthy();
    expect(callbacks.onEditVersion).not.toHaveBeenCalled();
  });

  test('perfected recipe viewed at an archived version has no Edit draft chip', async () => {
    const archived = makeRecipeVersionSummary({
      id: 'version-uuid-2',
      versionNumber: 2,
      derivedRole: 'archived',
    });
    const {findByText, queryByText} = await renderView({status: 'perfected'}, [
      makeRecipeVersionSummary(),
      archived,
    ]);
    // Switch the display to the archived version: the create-draft chip
    // clones the active version, so it must not be offered from here.
    await fireEvent.press(await findByText(/v1 — Active/));
    await fireEvent.press(await findByText(/v2 — Archived/));
    expect(queryByText('Edit draft')).toBeNull();
  });

  test('abandoned recipe has no Edit draft chip', async () => {
    const {findByText, queryByText} = await renderView({status: 'abandoned'});
    expect(await findByText('Test Recipe')).toBeTruthy();
    expect(queryByText('Edit draft')).toBeNull();
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
    const {callbacks, findByText} = await renderView({}, [
      makeRecipeVersionSummary(),
      archived,
    ]);
    await findByText('Test Recipe');
    await fireEvent.press(await findByText(/v1 — Active/));
    await fireEvent.press(await findByText(/v2 — Archived/));
    expect(callbacks.onSelectVersion).toHaveBeenCalledWith('version-uuid-2');
  });

  test('scales ingredients and runs the substitutions flow', async () => {
    mockSubstitutions.mockResolvedValue([
      {ingredient: 'Flour', suggestions: ['Rice flour', 'Oat flour']},
    ]);
    const archived = makeRecipeVersionSummary({
      id: 'version-uuid-2',
      versionNumber: 2,
      derivedRole: 'archived',
    });
    const {findByText, queryByText} = await renderView({}, [
      makeRecipeVersionSummary(),
      archived,
    ]);
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
    // Switching the displayed version resets the missing set: the marks
    // are per-version ingredient ids and must not leak across versions.
    await fireEvent.press(await findByText(/v1 — Active/));
    await fireEvent.press(await findByText(/v2 — Archived/));
    expect(await findByText('4 cups Flour')).toBeTruthy();
    expect(queryByText('Substitutions')).toBeNull();
  });

  test('echoes a committed custom scale back as the selected scale value', async () => {
    const utils = await renderView();
    const {findByText, getByLabelText, queryByText} = utils;
    await fireEvent.press(await findByText('Custom'));
    // The field's accessible label tracks the typed value in 1.15.0,
    // so hold the element reference across the edit.
    const customField = getByLabelText('Custom scale');
    await userEvent.type(customField, '2.5');
    fireEvent(customField, 'submitEditing');
    // The servings actually apply: 4 * 2.5 = 10, so the flour rescales
    // by the same factor the scale selection reports.
    expect(await findByText('5 cups Flour')).toBeTruthy();
    // The custom chip shows the committed value selected instead of
    // falling back to the ½× preset (the pre-1.8.1 host derivation).
    expect(await findByText('2.5×')).toBeTruthy();
    expect(queryByText('Custom')).toBeNull();
    expect(scaleSelected(utils, '½×')).toBe(false);
    expect(scaleSelected(utils, '2×')).toBe(false);
  });

  test('derives the scale when the servings stepper lands off-preset', async () => {
    const {findByText, getByLabelText, getByText} = await renderView();
    await findByText('Test Recipe');
    await fireEvent.press(getByLabelText('Increase Servings'));
    await fireEvent.press(getByLabelText('Increase Servings'));
    // 4 → 6 servings is a 1.5 ratio: no preset matches, so the custom
    // chip carries the derived ratio as the selected value.
    expect(await findByText('1.5×')).toBeTruthy();
    expect(scaleSelected({getByText}, '½×')).toBe(false);
  });

  test('passes the preset string through when a preset chip is chosen', async () => {
    const utils = await renderView();
    const {findByText} = utils;
    await fireEvent.press(await findByText('2×'));
    expect(await findByText('4 cups Flour')).toBeTruthy();
    expect(scaleSelected(utils, '2×')).toBe(true);
    // The custom chip stays at its resting label for a preset selection.
    expect(await findByText('Custom')).toBeTruthy();
  });

  test('derives the initial scale for servings starting on a preset', async () => {
    // Base servings 4 with the screen's servings already at 8: the 2×
    // preset is the selection, exactly as the old derivation had it.
    const utils = await renderView({}, undefined, 8);
    const {findByText} = utils;
    expect(await findByText('4 cups Flour')).toBeTruthy();
    expect(scaleSelected(utils, '2×')).toBe(true);
    expect(await findByText('Custom')).toBeTruthy();
  });

  test('derives the initial scale for servings starting off-preset', async () => {
    // Base servings 4 with the screen's servings already at 6: the
    // selection is the 1.5 ratio on the custom chip, not the ½× fallback.
    const utils = await renderView({}, undefined, 6);
    const {findByText} = utils;
    expect(await findByText('1.5×')).toBeTruthy();
    expect(scaleSelected(utils, '½×')).toBe(false);
  });

  test('renders the instruction steps', async () => {
    const {findByText} = await renderView();
    expect(await findByText('Mix dry ingredients')).toBeTruthy();
    expect(await findByText('Bake at 350°F')).toBeTruthy();
  });

  test('swaps the cook-log form for the button and saves through it', async () => {
    mockListCookLogs.mockResolvedValue([makeCookLog()]);
    const {recipe, findByText, queryByText} = await renderView();
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

  test('closes the cook-log form when the displayed version changes', async () => {
    const archived = makeRecipeVersionSummary({
      id: 'version-uuid-2',
      versionNumber: 2,
      derivedRole: 'archived',
    });
    const {findByText, queryByText} = await renderView({}, [
      makeRecipeVersionSummary(),
      archived,
    ]);
    await fireEvent.press(await findByText('Log a cook'));
    expect(await findByText('How did it go?')).toBeTruthy();
    // The form saves against the displayed version, so switching versions
    // closes it instead of retargeting the entry.
    await fireEvent.press(await findByText(/v1 — Active/));
    await fireEvent.press(await findByText(/v2 — Archived/));
    expect(await findByText('Log a cook')).toBeTruthy();
    expect(queryByText('How did it go?')).toBeNull();
  });

  test('renders nutrition rows and refreshes the estimate', async () => {
    const {recipe, findByText} = await renderView();
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
    expect(await findByText('Nutrition is not available yet.')).toBeTruthy();
    await fireEvent.press(await findByText('Estimate nutrition'));
    await waitFor(() => {
      expect(mockNutrition).toHaveBeenCalledWith(recipe.id, {refresh: true});
    });
  });

  test('a failed nutrition estimate is handled, not an unhandled rejection (#345)', async () => {
    // The initial (cached) lookup finds nothing, and the forced estimate
    // fails the way the server's 502 does — the error text PostHog
    // captured as an unhandled rejection on Android.
    mockNutrition.mockImplementation(
      (_recipeId: string, options?: {refresh?: boolean}) =>
        options?.refresh
          ? Promise.reject(new Error('Failed to estimate nutrition'))
          : Promise.resolve(null),
    );
    const {findByText} = await renderView();
    expect(await findByText('Nutrition is not available yet.')).toBeTruthy();
    await fireEvent.press(await findByText('Estimate nutrition'));
    // The failure surfaces as recoverable feedback and the unavailable
    // state (with its Estimate retry) stays in place.
    expect(
      await findByText('Could not refresh nutrition. Please try again.'),
    ).toBeTruthy();
    expect(await findByText('Nutrition is not available yet.')).toBeTruthy();
    expect(await findByText('Estimate nutrition')).toBeTruthy();
  });

  test('a failed nutrition refresh keeps the current estimate and shows feedback (#345)', async () => {
    mockNutrition.mockImplementation(
      (_recipeId: string, options?: {refresh?: boolean}) =>
        options?.refresh
          ? Promise.reject(new Error('Failed to estimate nutrition'))
          : Promise.resolve(nutritionFixture),
    );
    const {findByText} = await renderView();
    expect(await findByText('250')).toBeTruthy();
    await fireEvent.press(await findByText('Refresh'));
    expect(
      await findByText('Could not refresh nutrition. Please try again.'),
    ).toBeTruthy();
    // The previously loaded estimate is not discarded on failure.
    expect(await findByText('250')).toBeTruthy();
    expect(await findByText('Refresh')).toBeTruthy();
  });
});
