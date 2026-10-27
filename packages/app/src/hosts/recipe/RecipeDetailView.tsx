/* eslint-disable max-lines -- detail host: every section's queries, mutations, and view-model mapping */
import {
  canEditActiveRecipeMetadata,
  canEditDraftVersion,
  formatCommunityRatingLabel,
  formatScaledIngredientLine,
  invalidateRecipeQueries,
  isActiveScaleMultiplier,
  makeRecipeDetail,
  makeRecipeVersionSummary,
  nutritionTabRows,
  queryKeys,
  RECIPE_SCALE_MULTIPLIERS,
  servingsForMultiplier,
  sortIngredientsByOrder,
  truncateChangeSummary,
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
import {CookLogForm} from '@spudly/ui';
import {
  RecipeDetailPage,
  type RecipeDetailPageNutritionProps,
} from '@spudly/ui/pages';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';

import {api} from '../../lib/api';
import {printRecipe} from '../../lib/printRecipe';
import {shareRecipe} from '../../lib/shareRecipe';

import {RecipeCommentsSection} from './RecipeCommentsSection';
import {RecipeVisibilityControls} from './RecipeVisibilityControls';

type RecipeDetailViewProps = {
  recipe: RecipeDetail;
  displayRecipe: RecipeDetail;
  versions: RecipeVersionSummary[];
  selectedVersionId: string;
  onSelectVersion: (versionId: string) => void;
  currentServings: number;
  scaleFactor: number;
  onServingsChange: (servings: number) => void;
  onStartCooking: () => void;
  onDelete: () => void;
  onTweakAi: () => void;
  onViewVersion: (versionId: string) => void;
  onEditRecipe: () => void;
  onEditVersion: (versionId: string) => void;
};

/**
 * The Recipe detail screen's view (#49): the design system's RecipeDetailPage
 * renders the screen — pinned chrome above a single scroll view holding every
 * section (#71) — and this component is its app-side host. Everything the page
 * must not own stays here: the recipe/version queries' results are mapped to
 * the page's per-section view-models at this boundary (picker and candidate
 * labels formatted with the same helpers the old VersionPicker and
 * OverviewActions used, ingredient lines scaled by the app's formatter,
 * nutrition rows composed by the client's row builder), and every mutation
 * (status, activation, tweak-manually, rating, cook log) plus the three slotted
 * app panels (sharing controls, comments, cook-log form) keep their state and
 * API calls app-side.
 *
 * State lifetimes are mapped defensively: the tab components this page replaced
 * unmounted on every tab switch, which reset the ingredients tab's missing set
 * and closed the history tab's cook-log form. The single-scroll page never
 * unmounts its sections, so both resets hang off the displayed recipe/version
 * changing instead (see the effect below) — ingredient ids are per-version and
 * the cook-log form saves against the displayed version, so neither piece of
 * state may leak across versions. The mutations, by contrast, already lived in
 * the tab components above their forms, so hosting them here preserves their
 * semantics — with one deliberate improvement from the Recipes list rewire
 * (#197): a save still in flight when its form is cancelled and reopened now
 * shows as pending in the reopened form (the shared mutation's isPending)
 * instead of allowing a duplicate submit against an orphaned request.
 */

const VERSION_ROLE_LABELS: Record<RecipeVersionSummary['derivedRole'], string> =
  {
    active: 'Active',
    archived: 'Archived',
    draft: 'Draft',
    candidate: 'Candidate',
  };

/**
 * The version picker's row label, formatted as the app's VersionPicker
 * formatted it ("v3 — Active: summary").
 */
const versionPickerLabel = (version: RecipeVersionSummary): string =>
  `v${version.versionNumber} — ${VERSION_ROLE_LABELS[version.derivedRole]}${
    version.changeSummary
      ? `: ${truncateChangeSummary(version.changeSummary)}`
      : ''
  }`;

/**
 * The activation candidate's label, formatted as the app's OverviewActions
 * formatted it ("v3: summary").
 */
const candidateLabel = (version: RecipeVersionSummary): string =>
  `v${version.versionNumber}${
    version.changeSummary
      ? `: ${truncateChangeSummary(version.changeSummary)}`
      : ''
  }`;

/**
 * The scale string the page shows as selected for a base/current servings pair
 * when the servings were not set through a scale selection: the preset's string
 * when the applied servings are exactly that preset's, otherwise the exact
 * servings ratio as a plain number string — the same form the page's custom
 * chip formats ("2.5", never "2.50").
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

export const RecipeDetailView = ({
  recipe,
  displayRecipe,
  versions,
  selectedVersionId,
  onSelectVersion,
  currentServings,
  scaleFactor,
  onServingsChange,
  onStartCooking,
  onDelete,
  onTweakAi,
  onViewVersion,
  onEditRecipe,
  onEditVersion,
}: RecipeDetailViewProps) => {
  const queryClient = useQueryClient();
  const {session} = useAuth();

  // Transient action feedback ("Version activated", "Sharing settings
  // updated"), held by the old OverviewTab and passed to its panels; the
  // page renders it from the overview view-model.
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const showActionMessage = (message: string) => {
    setActionMessage(message);
    setTimeout(() => {
      setActionMessage(null);
    }, 2500);
  };

  const invalidate = () =>
    invalidateRecipeQueries(
      queryClient,
      displayRecipe.id,
      displayRecipe.versionId,
    );

  // Lifecycle mutations (the old OverviewActions): status changes,
  // candidate activation, and tweak-manually version creation.
  const statusMutation = useMutation({
    mutationFn: (status: RecipeDetail['status']) =>
      api.recipes.patchStatus(displayRecipe.id, status),
    onSuccess: () => {
      void invalidate();
    },
  });
  const activateMutation = useMutation({
    mutationFn: (versionId: string) =>
      api.versions.activate(displayRecipe.id, versionId),
    onSuccess: () => {
      void invalidate();
      showActionMessage('Version activated');
    },
  });
  const tweakManualMutation = useMutation({
    mutationFn: () => api.versions.create(displayRecipe.id),
    onSuccess: version => {
      void invalidate();
      onViewVersion(version.id);
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

  // Ratings (the old RecipeRatingsSection): the community rating is
  // display data; the viewer's star input is controlled, with the
  // put/delete mutation behind the change callback.
  const ratingsSummary = recipe as RecipeDetail & RecipeRatingSummary;
  const ratingMutation = useMutation({
    mutationFn: async (stars: RecipeStarRating | null) => {
      if (stars === null) {
        return api.recipes.deleteRating(recipe.id);
      }
      return api.recipes.putRating(recipe.id, {stars});
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

  // Ingredients (the old IngredientsTab): the missing set and the
  // substitutions lookup it drives stay app-side; rows are view-modeled
  // with their missing flags.
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
      queryFn: () => api.ai.substitutions(recipe.id, missingNames),
      enabled: missingNames.length > 0,
    });

  const baseServings = displayRecipe.servings;

  // The selected scale is host state, not a pure derivation from the
  // servings (#73): the page's custom chip renders selected with its
  // value only when the host echoes a non-preset scaleValue back, and a
  // derivation can only name presets — deriving fell back to ½× for any
  // off-preset servings, so a committed custom scale (2.5×) showed the
  // ½× chip selected while the ingredients were scaled 2.5×. The state
  // is keyed to the base and servings the selection was recorded at:
  // onScaleChange records the page's raw value alongside the servings it
  // applies, servings changes record their derivation, and a render-time
  // mismatch means the servings moved without a selection behind them
  // (the screen resets them on a version switch), so the selection
  // re-derives from the servings that actually apply.
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

  // Cook history (the old CookHistoryTab): the entries are view-modeled;
  // the form's open state, its mutation, and the form itself stay here
  // and enter through the page's form slot.
  const [showCookLogForm, setShowCookLogForm] = useState(false);
  const {data: cookLogs = [], isLoading: isLoadingCookLogs} = useQuery({
    queryKey: queryKeys.cookLogs(recipe.id, displayRecipe.versionId),
    queryFn: () => api.cookLogs.list(recipe.id, displayRecipe.versionId),
  });
  const createCookLogMutation = useMutation({
    mutationFn: (input: CookLogInput) =>
      api.cookLogs.create(recipe.id, displayRecipe.versionId, input),
    onSuccess: async () => {
      await invalidateRecipeQueries(
        queryClient,
        recipe.id,
        displayRecipe.versionId,
      );
      setShowCookLogForm(false);
    },
  });

  // Nutrition (the old NutritionTab): the estimate query and its manual
  // refresh, mapped to the page's loading/unavailable/ready union.
  const [isRefreshingNutrition, setIsRefreshingNutrition] = useState(false);
  const {
    data: nutrition,
    isLoading: isLoadingNutrition,
    isFetching: isFetchingNutrition,
  } = useQuery({
    queryKey: queryKeys.nutrition(recipe.id),
    queryFn: () => api.ai.nutrition(recipe.id),
  });
  const handleNutritionRefresh = async () => {
    setIsRefreshingNutrition(true);
    try {
      const next = await api.ai.nutrition(recipe.id, {refresh: true});
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
  // another version's rows or drive its substitutions lookup), and an
  // open cook-log form saves against the displayed version, so it
  // closes rather than submitting against a version picked after it
  // was opened. Within one displayed version the form still closes
  // only through its own paths (Cancel/success), as before.
  useEffect(() => {
    setMissingIds(current => (current.size === 0 ? current : new Set()));
    setShowCookLogForm(false);
  }, [displayRecipe.id, displayRecipe.versionId]);

  const canEditDraft = canEditDraftVersion(displayRecipe.versionId, versions);
  const canEditMetadata = canEditActiveRecipeMetadata(
    displayRecipe.status,
    displayRecipe.versionId,
    recipe.versionId,
    versions,
  );

  return (
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
        onStartCooking,
        onPrintPress: () => {
          void printRecipe(displayRecipe);
        },
        onSharePress: () => {
          void shareRecipe(displayRecipe);
        },
        onEditPress: canEditMetadata ? onEditRecipe : undefined,
        onEditDraftPress: canEditDraft
          ? () => {
              onEditVersion(displayRecipe.versionId);
            }
          : undefined,
        onDeletePress: onDelete,
        lifecycle,
        onTweakManuallyPress: () => {
          tweakManualMutation.mutate();
        },
        onTweakAiPress: onTweakAi,
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
          color: tag.color,
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
          dateLabel: new Date(log.cookedAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          starRating: log.authorStarRating,
          notes: log.notes,
        })),
        onLogCookPress: () => {
          setShowCookLogForm(true);
        },
        renderCookLogForm: () =>
          showCookLogForm ? (
            <CookLogForm
              variant="light"
              isPending={createCookLogMutation.isPending}
              onSkip={() => {
                setShowCookLogForm(false);
              }}
              onSubmit={(input: CookLogInput) => {
                createCookLogMutation.mutate(input);
              }}
            />
          ) : null,
      }}
      nutrition={nutritionProps}
    />
  );
};
