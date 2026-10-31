/* eslint-disable max-lines -- detail host: every section's queries, mutations, and view-model mapping */
import {
  canCreateDraftVersion,
  canEditActiveRecipeMetadata,
  canEditDraftVersion,
  formatCommunityRatingLabel,
  formatScaledIngredientLine,
  invalidateRecipeQueries,
  isActiveScaleMultiplier,
  nutritionTabRows,
  queryKeys,
  RECIPE_SCALE_MULTIPLIERS,
  removeRecipeView,
  servingsForMultiplier,
  sortIngredientsByOrder,
  truncateChangeSummary,
  useAnalytics,
  useAuth,
  type RecipeScaleMultiplier,
} from '@eciperay/client';
import type {
  CookLogInput,
  RecipeDetail,
  RecipeRatingSummary,
  RecipeStarRating,
  RecipeVersionSummary,
} from '@eciperay/types';
import {Alert, Button, Dialog, RatingForm, tagColorNameForHex} from '@spudly/ui';
import {
  RecipeDetailPage,
  type RecipeDetailPageNutritionProps,
} from '@spudly/ui/pages';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {RecipeCommentsSection} from '../components/recipe/RecipeCommentsSection.js';
import {RecipeVisibilityControls} from '../components/recipe/RecipeVisibilityControls.js';
import {eciperay} from '../lib/api.js';
import {printRecipe} from '../lib/printRecipe.js';
import {recipeViewHistoryStorage} from '../lib/recipeViewHistoryStorage.js';
import {shareRecipe} from '../lib/shareRecipe.js';

type RecipeDetailHostProps = {
  recipe: RecipeDetail;
  displayRecipe: RecipeDetail;
  versions: RecipeVersionSummary[];
  selectedVersionId: string;
  onSelectVersion: (versionId: string) => void;
  currentServings: number;
  scaleFactor: number;
  onServingsChange: (servings: number) => void;
};

/**
 * The web recipe detail page's host (B7 cluster C7, design-system#130):
 * the design system's RecipeDetailPage renders the surface — pinned
 * chrome above a single scroll view holding every section — and this
 * component is its web-side host, following the native app's
 * RecipeDetailView host prop-for-prop where the platforms agree.
 * Everything the page must not own stays here: the recipe/version
 * queries' results are mapped to the page's per-section view-models at
 * this boundary (picker and candidate labels formatted with the same
 * helpers the retired VersionPicker and OverviewActions used,
 * ingredient lines scaled by the client's formatter, nutrition rows
 * composed by the client's row builder), and every mutation (status,
 * activation, tweak-manually, create-a-draft, rating, cook log, recipe
 * delete) plus the two slotted web panels (sharing controls, comments)
 * keep their state and API calls web-side.
 *
 * State lifetimes are mapped defensively, as in the app host: the tab
 * components this page replaced unmounted on every tab switch, which
 * reset the ingredients tab's missing set and closed the history tab's
 * cook-log form. The single-scroll page never unmounts its sections,
 * so both resets hang off the displayed recipe/version changing
 * instead (see the effect below) — ingredient ids are per-version and
 * the cook-log form saves against the displayed version, so neither
 * piece of state may leak across versions.
 *
 * Deletion confirmations (#263 recipe, #266 cook log) stay host-side,
 * as the page contract assigns them: the page's Delete presses only
 * report intent, and this host confirms through the design system's
 * Dialog — the web counterpart of the app's native Alert — because
 * window.confirm is suppressed in some browsers/webviews, which made
 * Delete a silent no-op. Failures surface inside the dialog instead of
 * failing silently.
 */

const VERSION_ROLE_LABELS: Record<RecipeVersionSummary['derivedRole'], string> =
  {
    active: 'Active',
    archived: 'Archived',
    draft: 'Draft',
    candidate: 'Candidate',
  };

/**
 * The version picker's row label, formatted as the retired web
 * VersionPicker formatted it ("v3 — Active: summary").
 */
const versionPickerLabel = (version: RecipeVersionSummary): string =>
  `v${version.versionNumber} — ${VERSION_ROLE_LABELS[version.derivedRole]}${
    version.changeSummary
      ? `: ${truncateChangeSummary(version.changeSummary)}`
      : ''
  }`;

/**
 * The activation candidate's label, formatted as the retired
 * OverviewActions formatted it ("v3: summary").
 */
const candidateLabel = (version: RecipeVersionSummary): string =>
  `v${version.versionNumber}${
    version.changeSummary
      ? `: ${truncateChangeSummary(version.changeSummary)}`
      : ''
  }`;

/**
 * The scale string the page shows as selected for a base/current
 * servings pair when the servings were not set through a scale
 * selection: the preset's string when the applied servings are exactly
 * that preset's, otherwise the exact servings ratio as a plain number
 * string — the same form the page's custom chip formats ("2.5", never
 * "2.50").
 */
const deriveScaleValue = (
  baseServings: number,
  currentServings: number,
): string => {
  const preset = RECIPE_SCALE_MULTIPLIERS.find(multiplier =>
    isActiveScaleMultiplier(baseServings, currentServings, multiplier),
  );
  return preset === undefined
    ? String(currentServings / baseServings)
    : String(preset);
};

const formatCookLogDate = (cookedAt: string): string =>
  new Date(cookedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export const RecipeDetailHost = ({
  recipe,
  displayRecipe,
  versions,
  selectedVersionId,
  onSelectVersion,
  currentServings,
  scaleFactor,
  onServingsChange,
}: RecipeDetailHostProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const analytics = useAnalytics();
  const {session} = useAuth();

  // Transient action feedback ("Version activated", "Sharing settings
  // updated", share outcomes), held by the retired OverviewTab and
  // passed to its panels; the page renders it from the overview
  // view-model.
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const showActionMessage = (message: string) => {
    setActionMessage(message);
    window.setTimeout(() => {
      setActionMessage(null);
    }, 2500);
  };

  const invalidate = () =>
    invalidateRecipeQueries(
      queryClient,
      displayRecipe.id,
      displayRecipe.versionId,
    );

  // Lifecycle mutations (the retired OverviewActions): status changes,
  // candidate activation, and tweak-manually version creation.
  const statusMutation = useMutation({
    mutationFn: (status: RecipeDetail['status']) =>
      eciperay.recipes.patchStatus(displayRecipe.id, status),
    onSuccess: () => {
      void invalidate();
    },
  });
  const activateMutation = useMutation({
    mutationFn: (versionId: string) =>
      eciperay.versions.activate(displayRecipe.id, versionId),
    onSuccess: () => {
      void invalidate();
      showActionMessage('Version activated');
    },
  });
  const tweakManualMutation = useMutation({
    mutationFn: () => eciperay.versions.create(displayRecipe.id),
    onSuccess: version => {
      void invalidate();
      onSelectVersion(version.id);
    },
  });

  // A Perfected recipe's active version is locked, so creating a draft
  // is its only path to changes (#264): the draft opens directly in
  // the version editor, where it can actually be edited and saved. The
  // @spudly/ui 1.16.0 page contract carries the flow as
  // onCreateDraftPress — a mutation-then-navigate control, exempt from
  // the href rule by the #248 borderline ruling — and renders it as
  // the "Edit draft" button whenever no existing draft's editDraftHref
  // is passed. Creating a draft clones the ACTIVE version (the
  // server's createVersion always clones it), so the action is only
  // offered while the active version is the one on display — on an
  // archived version it would silently draft from a version the user
  // is not looking at.
  const canCreateDraft =
    canCreateDraftVersion(displayRecipe.status) &&
    displayRecipe.versionId === recipe.versionId;
  const createDraftMutation = useMutation({
    mutationFn: () => eciperay.versions.create(recipe.id),
    onSuccess: version => {
      void invalidate();
      void navigate(`/recipes/${recipe.id}/versions/${version.id}/edit`);
    },
  });

  const isEditable =
    displayRecipe.status !== 'perfected' &&
    displayRecipe.status !== 'abandoned';
  const candidates = versions.filter(v => v.derivedRole === 'candidate');
  const lifecycle =
    isEditable || candidates.length > 0
      ? {
          isEditable,
          isTweakPending: tweakManualMutation.isPending,
          isStatusChangePending: statusMutation.isPending,
          isActivationPending: activateMutation.isPending,
          candidates: candidates.map(version => ({
            id: version.id,
            label: candidateLabel(version),
          })),
        }
      : null;

  // Recipe deletion (#263): the page's Delete press opens the host's
  // confirmation dialog; the mutation itself is the retired
  // OverviewTab's — history cleanup is best-effort (the server delete
  // already succeeded, so a storage failure must not route to
  // onError), and success drops the deleted recipe's detail cache so
  // navigating back to its URL cannot render the stale cached recipe
  // (#273).
  const [confirmingRecipeDelete, setConfirmingRecipeDelete] = useState(false);
  const [recipeDeleteError, setRecipeDeleteError] = useState<string | null>(
    null,
  );
  const deleteRecipeMutation = useMutation({
    mutationFn: async () => {
      await eciperay.recipes.delete(recipe.id);
      await removeRecipeView(recipeViewHistoryStorage, recipe.id).catch(
        () => undefined,
      );
    },
    onSuccess: () => {
      analytics.track('recipe_deleted', {recipe_id: recipe.id});
      void invalidateRecipeQueries(queryClient, recipe.id, recipe.versionId);
      void navigate('/recipes');
      // Runs after navigate so this page does not flash its not-found
      // state on the way out.
      queryClient.removeQueries({
        queryKey: queryKeys.recipe(recipe.id),
      });
    },
    onError: error => {
      setRecipeDeleteError(
        `Could not delete recipe: ${
          error instanceof Error ? error.message : 'Recipe deletion failed'
        }`,
      );
    },
  });

  // Ratings (the retired RecipeRatingsSection): the community rating
  // is display data; the viewer's star input is controlled, with the
  // put/delete mutation behind the change callback.
  const ratingsSummary = recipe as RecipeDetail & RecipeRatingSummary;
  const ratingMutation = useMutation({
    mutationFn: async (stars: RecipeStarRating | null) => {
      if (stars === null) {
        return eciperay.recipes.deleteRating(recipe.id);
      }
      return eciperay.recipes.putRating(recipe.id, {stars});
    },
    onSuccess: data => {
      queryClient.setQueryData(queryKeys.recipe(recipe.id), data);
    },
  });
  const communityRating = ratingsSummary.communityRating;
  const ratings = {
    community: communityRating
      ? {
          stars: '★'.repeat(Math.round(communityRating.average)),
          label: formatCommunityRatingLabel(
            communityRating.average,
            communityRating.count,
          ),
          hasStaleRatings: communityRating.hasStaleRatings,
        }
      : null,
    viewer: session
      ? {
          value: ratingsSummary.viewerRating,
          isStale: ratingsSummary.viewerRatingIsStale,
          isPending: ratingMutation.isPending,
        }
      : null,
  };

  // Ingredients (the retired IngredientsTab): the missing set and the
  // substitutions lookup it drives stay host-side; rows are
  // view-modeled with their missing flags.
  const [missingIds, setMissingIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const toggleMissing = (ingredientId: string) => {
    setMissingIds(current => {
      const next = new Set(current);
      if (next.has(ingredientId)) {
        next.delete(ingredientId);
      } else {
        next.add(ingredientId);
      }
      return next;
    });
  };
  const missingNames = displayRecipe.ingredients
    .filter(ingredient => missingIds.has(ingredient.id))
    .map(ingredient => ingredient.name);
  const {data: substitutions = [], isFetching: isLoadingSubstitutions} =
    useQuery({
      queryKey: [...queryKeys.recipe(recipe.id), 'substitutions', missingNames],
      queryFn: () => eciperay.ai.substitutions(recipe.id, missingNames),
      enabled: missingNames.length > 0,
    });

  const baseServings = displayRecipe.servings;

  // The selected scale is host state, not a pure derivation from the
  // servings — the same echo contract the app host documents (#73):
  // the page's custom chip renders selected with its value only when
  // the host echoes a non-preset scaleValue back, and a derivation can
  // only name presets. The state is keyed to the base and servings the
  // selection was recorded at; a render-time mismatch means the
  // servings moved without a selection behind them (the page resets
  // them on a version switch), so the selection re-derives from the
  // servings that actually apply.
  const [scaleSelection, setScaleSelection] = useState(() => ({
    baseServings,
    servings: currentServings,
    value: deriveScaleValue(baseServings, currentServings),
  }));
  if (
    scaleSelection.baseServings !== baseServings ||
    scaleSelection.servings !== currentServings
  ) {
    setScaleSelection({
      baseServings,
      servings: currentServings,
      value: deriveScaleValue(baseServings, currentServings),
    });
  }
  const scaleValue = scaleSelection.value;

  // Cook history (the retired CookHistoryTab): the entries are
  // view-modeled; the form's open state, its mutation, and the form
  // itself stay here and enter through the page's form slot.
  const [showCookLogForm, setShowCookLogForm] = useState(false);
  const {data: cookLogs = [], isLoading: isLoadingCookLogs} = useQuery({
    queryKey: queryKeys.cookLogs(recipe.id, displayRecipe.versionId),
    queryFn: () => eciperay.cookLogs.list(recipe.id, displayRecipe.versionId),
  });
  const createCookLogMutation = useMutation({
    mutationFn: (input: CookLogInput) =>
      eciperay.cookLogs.create(recipe.id, displayRecipe.versionId, input),
    onSuccess: async () => {
      await invalidateRecipeQueries(
        queryClient,
        recipe.id,
        displayRecipe.versionId,
      );
      setShowCookLogForm(false);
    },
  });

  // Cook-log deletion (#266) confirms host-side through the Dialog,
  // mirroring the recipe deletion above: the page's per-entry Delete
  // press reports the entry's id, and the mutation plus its error
  // surface live here.
  const [confirmingCookLogDeleteId, setConfirmingCookLogDeleteId] = useState<
    string | null
  >(null);
  const [cookLogDeleteError, setCookLogDeleteError] = useState<string | null>(
    null,
  );
  const deleteCookLogMutation = useMutation({
    mutationFn: (cookLogId: string) =>
      eciperay.cookLogs.remove(recipe.id, displayRecipe.versionId, cookLogId),
    onSuccess: async () => {
      await invalidateRecipeQueries(
        queryClient,
        recipe.id,
        displayRecipe.versionId,
      );
      setConfirmingCookLogDeleteId(null);
      setCookLogDeleteError(null);
    },
    onError: error => {
      setCookLogDeleteError(
        `Could not delete entry: ${
          error instanceof Error ? error.message : 'Failed to delete entry'
        }`,
      );
    },
  });
  const confirmingCookLog = cookLogs.find(
    log => log.id === confirmingCookLogDeleteId,
  );

  // Nutrition (the retired NutritionTab): the estimate query and its
  // manual refresh, mapped to the page's loading/unavailable/ready
  // union.
  const [isRefreshingNutrition, setIsRefreshingNutrition] = useState(false);
  const {
    data: nutrition,
    isLoading: isLoadingNutrition,
    isFetching: isFetchingNutrition,
  } = useQuery({
    queryKey: queryKeys.nutrition(recipe.id),
    queryFn: () => eciperay.ai.nutrition(recipe.id),
  });
  const handleNutritionRefresh = async () => {
    setIsRefreshingNutrition(true);
    try {
      const next = await eciperay.ai.nutrition(recipe.id, {refresh: true});
      queryClient.setQueryData(queryKeys.nutrition(recipe.id), next);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.recipe(recipe.id),
      });
      void queryClient.invalidateQueries({queryKey: queryKeys.recipeLists()});
    } finally {
      setIsRefreshingNutrition(false);
    }
  };
  const nutritionProps: RecipeDetailPageNutritionProps = isLoadingNutrition
    ? {state: 'loading'}
    : !nutrition
      ? {
          state: 'unavailable',
          isRefreshing: isRefreshingNutrition,
          onEstimatePress: () => {
            void handleNutritionRefresh();
          },
        }
      : {
          state: 'ready',
          rows: nutritionTabRows(nutrition).map(row => ({
            label: row.label,
            valueLabel: `${row.value}${row.unit}`,
          })),
          disclaimer: nutrition.disclaimer,
          isRefreshing: isRefreshingNutrition,
          isFetching: isFetchingNutrition,
          onRefreshPress: () => {
            void handleNutritionRefresh();
          },
        };

  // The tab components unmounted on every tab switch, resetting the
  // ingredients tab's missing set and closing the history tab's form.
  // The single-scroll page never unmounts sections, so both resets hang
  // off the displayed recipe/version changing: the missing set holds
  // per-version ingredient ids (a mark on one version must never flag
  // another version's rows or drive its substitutions lookup), an open
  // cook-log form saves against the displayed version, and a pending
  // cook-log deletion names an entry of the version on display — all
  // three close rather than leaking across versions. Within one
  // displayed version the form still closes only through its own paths
  // (Cancel/success), as before.
  useEffect(() => {
    setMissingIds(current => (current.size === 0 ? current : new Set()));
    setShowCookLogForm(false);
    setConfirmingCookLogDeleteId(null);
    setCookLogDeleteError(null);
  }, [displayRecipe.id, displayRecipe.versionId]);

  const canEditDraft = canEditDraftVersion(displayRecipe.versionId, versions);
  const canEditMetadata = canEditActiveRecipeMetadata(
    displayRecipe.status,
    displayRecipe.versionId,
    recipe.versionId,
    versions,
  );

  const handleShare = async () => {
    try {
      const result = await shareRecipe(displayRecipe);
      showActionMessage(
        result === 'copied' ? 'Recipe copied to clipboard' : 'Recipe shared',
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      showActionMessage('Could not share recipe');
    }
  };

  return (
    <>
      <RecipeDetailPage
        state="ready"
        status={recipe.status}
        versions={versions.map(version => ({
          id: version.id,
          label: versionPickerLabel(version),
          versionNumber: version.versionNumber,
        }))}
        selectedVersionId={selectedVersionId}
        onSelectVersion={onSelectVersion}
        overview={{
          imageUrl: displayRecipe.imageUrl,
          title: displayRecipe.title,
          description: displayRecipe.description,
          servingsLabel: String(currentServings),
          prepTimeLabel: displayRecipe.prepTimeMin
            ? `${displayRecipe.prepTimeMin}m`
            : undefined,
          cookTimeLabel: displayRecipe.cookTimeMin
            ? `${displayRecipe.cookTimeMin}m`
            : undefined,
          actionMessage,
          cookingHref: `/recipes/${recipe.id}/cook?versionId=${displayRecipe.versionId}&servings=${currentServings}`,
          onPrintPress: () => {
            printRecipe(displayRecipe);
          },
          onSharePress: () => {
            void handleShare();
          },
          editHref: canEditMetadata ? `/recipes/${recipe.id}/edit` : undefined,
          editDraftHref: canEditDraft
            ? `/recipes/${recipe.id}/versions/${displayRecipe.versionId}/edit`
            : undefined,
          onCreateDraftPress: canCreateDraft
            ? () => {
                if (!createDraftMutation.isPending) {
                  createDraftMutation.mutate();
                }
              }
            : undefined,
          onDeletePress: () => {
            setRecipeDeleteError(null);
            setConfirmingRecipeDelete(true);
          },
          lifecycle,
          onTweakManuallyPress: () => {
            tweakManualMutation.mutate();
          },
          tweakAiHref: `/recipes/${recipe.id}/tweak-ai`,
          onMarkPerfectedPress: () => {
            statusMutation.mutate('perfected');
          },
          onAbandonPress: () => {
            statusMutation.mutate('abandoned');
          },
          onActivateCandidatePress: (versionId: string) => {
            activateMutation.mutate(versionId);
          },
          tags: displayRecipe.tags.map(tag => ({
            id: tag.id,
            name: tag.name,
            color: tagColorNameForHex(tag.color),
          })),
          ratings,
          onViewerRatingChange: (stars: number | null) => {
            ratingMutation.mutate(stars as RecipeStarRating | null);
          },
          renderSharingControls: () => (
            <RecipeVisibilityControls
              recipe={displayRecipe}
              onActionMessage={showActionMessage}
            />
          ),
          renderComments: () => (
            <RecipeCommentsSection
              recipeId={recipe.id}
              ownerUserId={recipe.userId}
            />
          ),
        }}
        ingredients={{
          servings: currentServings,
          onServingsChange: (servings: number) => {
            setScaleSelection({
              baseServings,
              servings,
              value: deriveScaleValue(baseServings, servings),
            });
            onServingsChange(servings);
          },
          scaleValue,
          onScaleChange: (value: string) => {
            const nextServings = servingsForMultiplier(
              baseServings,
              Number(value) as RecipeScaleMultiplier,
            );
            setScaleSelection({baseServings, servings: nextServings, value});
            onServingsChange(nextServings);
          },
          ingredients: sortIngredientsByOrder(displayRecipe.ingredients).map(
            ingredient => ({
              id: ingredient.id,
              label: formatScaledIngredientLine(ingredient, scaleFactor),
              isOptional: ingredient.isOptional,
              isMissing: missingIds.has(ingredient.id),
            }),
          ),
          onIngredientPress: toggleMissing,
          isLoadingSubstitutions,
          substitutions: substitutions.map(substitution => ({
            ingredient: substitution.ingredient,
            suggestions: substitution.suggestions.join(', '),
          })),
        }}
        instructions={{
          instructions: displayRecipe.instructions.map(instruction => ({
            id: instruction.id,
            stepNumber: instruction.stepNumber,
            body: instruction.body,
          })),
        }}
        history={{
          isLoading: isLoadingCookLogs,
          cookLogs: cookLogs.map(log => ({
            id: log.id,
            dateLabel: formatCookLogDate(log.cookedAt),
            starRating: log.authorStarRating,
            notes: log.notes,
          })),
          onLogCookPress: () => {
            setShowCookLogForm(true);
          },
          onDeleteCookLogPress: (cookLogId: string) => {
            setCookLogDeleteError(null);
            setConfirmingCookLogDeleteId(cookLogId);
          },
          renderCookLogForm: () =>
            showCookLogForm ? (
              <RatingForm
                variant="light"
                notesPlaceholder="Notes from this cook (optional)"
                isPending={createCookLogMutation.isPending}
                onSkip={() => {
                  setShowCookLogForm(false);
                }}
                onSubmit={values => {
                  createCookLogMutation.mutate({
                    authorStarRating: values.rating,
                    notes: values.notes,
                  });
                }}
              />
            ) : null,
        }}
        nutrition={nutritionProps}
      />
      <Dialog
        open={confirmingRecipeDelete}
        onOpenChange={open => {
          if (!open) {
            setConfirmingRecipeDelete(false);
            setRecipeDeleteError(null);
          }
        }}
        title="Delete recipe"
        description={`Delete "${displayRecipe.title}"?`}
        actions={
          <>
            <Button
              variant="secondary"
              disabled={deleteRecipeMutation.isPending}
              onPress={() => {
                setConfirmingRecipeDelete(false);
                setRecipeDeleteError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deleteRecipeMutation.isPending}
              onPress={() => {
                setRecipeDeleteError(null);
                deleteRecipeMutation.mutate();
              }}
            >
              {deleteRecipeMutation.isPending ? 'Deleting…' : 'Confirm delete'}
            </Button>
          </>
        }
      >
        {recipeDeleteError ? (
          <Alert
            severity="error"
            message={recipeDeleteError}
          />
        ) : null}
      </Dialog>
      <Dialog
        open={confirmingCookLog !== undefined}
        onOpenChange={open => {
          if (!open) {
            setConfirmingCookLogDeleteId(null);
            setCookLogDeleteError(null);
          }
        }}
        title="Delete cook log entry"
        description={
          confirmingCookLog
            ? `Delete the cook log from ${formatCookLogDate(confirmingCookLog.cookedAt)}?`
            : undefined
        }
        actions={
          <>
            <Button
              variant="secondary"
              disabled={deleteCookLogMutation.isPending}
              onPress={() => {
                setConfirmingCookLogDeleteId(null);
                setCookLogDeleteError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deleteCookLogMutation.isPending}
              onPress={() => {
                if (confirmingCookLogDeleteId) {
                  setCookLogDeleteError(null);
                  deleteCookLogMutation.mutate(confirmingCookLogDeleteId);
                }
              }}
            >
              {deleteCookLogMutation.isPending ? 'Deleting…' : 'Confirm delete'}
            </Button>
          </>
        }
      >
        {cookLogDeleteError ? (
          <Alert
            severity="error"
            message={cookLogDeleteError}
          />
        ) : null}
      </Dialog>
    </>
  );
};
