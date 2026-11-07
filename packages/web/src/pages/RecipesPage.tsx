import {
  formatCondensedNutritionParts,
  formatSatietyLabel,
  formatServingsLabel,
  getDisplayRating,
  invalidateRecipeQueries,
  recipeListInfiniteQueryOptions,
  useRecipeListFilters,
  type RecipeStatusFilterValue,
} from '@eciperay/client';
import type {
  CookLogInput,
  RecipeDetail,
  RecipeListSort,
  RecipeListSortDir,
} from '@eciperay/types';
import {tokens} from '@spudly/ui';
import {RecipesPage as RecipesPageView, type RecipesPageItem} from '@spudly/ui';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {useCallback, useEffect, useRef, useState} from 'react';

import {CookLogForm} from '../components/cooking/CookLogForm.js';
import {eciperay} from '../lib/api.js';

/**
 * The subtitle for a RecipesPage row: servings · time · condensed nutrition
 * (calories · protein · carbs · fat, each only when known) · satiety, with no
 * rating segment — the page renders the rating itself as the row's stars (the
 * log-cook control), so keeping the text would show the rating twice. It
 * mirrors the app host's subtitle (the shared `formatRecipeListSubtitle` minus
 * its rating text) so both hosts present the same meta line on the same page
 * component.
 */
const formatRecipesPageSubtitle = (recipe: RecipeDetail) =>
  `${formatServingsLabel(recipe.servings)}${recipe.cookTimeMin ? ` · ${recipe.cookTimeMin} min` : ''} · ${[
    ...formatCondensedNutritionParts(recipe),
    formatSatietyLabel(recipe.satietyScore, recipe.nutritionStatus),
  ].join(' · ')}`;

/**
 * One row's inline cook-log form, rendered through the page's per-row accessory
 * slot — the composition the app host established for this page. The form is
 * the host's own CookLogForm (the design system's generalized RatingForm is
 * gone in @spudly/ui 6.x, so the accessory is the web cook-log form that serves
 * the recipe detail cook-history tab, driven by the relocated host
 * StarRatingInput). Its submit values are already a CookLogInput, so they cross
 * to the mutation unchanged.
 *
 * The lifetime guards mirror the app host's, for the same reasons: this
 * component unmounts with the slot, so a cancel during a pending save would
 * orphan the in-flight request and let a reopened form save a duplicate — Skip
 * is inert while the save is pending. The list can likewise unmount a row that
 * scrolls far off screen, and the lifted open set would survive the unmount, so
 * the form reconciles on the way out (its unmount cleanup closes it) and a row
 * that scrolls back returns closed. And a save completing after its form was
 * replaced must not close the replacement, so the success close is guarded by
 * this form's mounted lifetime (invalidation itself always runs).
 *
 * One web-only divergence from the app host: the unmount reconcile is deferred
 * a tick and cancelled if the effect re-runs, because the web app renders under
 * StrictMode, whose development replay (setup, cleanup, setup on one mount)
 * would otherwise reconcile a form that never truly unmounted and close it
 * immediately.
 */
const InlineCookLogForm = ({
  recipe,
  onClose,
}: {
  recipe: RecipeDetail;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (input: CookLogInput) =>
      eciperay.cookLogs.create(recipe.id, recipe.versionId, input),
    onSuccess: async () => {
      await invalidateRecipeQueries(queryClient, recipe.id, recipe.versionId);
      if (isMountedRef.current) {
        onClose();
      }
    },
  });

  // The latest onClose, for the unmount cleanup below: the host
  // passes a fresh closure on every render, so the cleanup cannot
  // depend on the prop itself without firing on every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // This form's mounted lifetime: set on mount, cleared by the
  // unmount cleanup, which also reconciles the open flag (see the
  // doc comment). The reconcile is deferred one tick and cancelled
  // if the effect re-runs first (the StrictMode replay — see the
  // doc comment); a true unmount is never followed by a re-run.
  const isMountedRef = useRef(false);
  const reconcileTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    isMountedRef.current = true;
    if (reconcileTimerRef.current !== undefined) {
      window.clearTimeout(reconcileTimerRef.current);
      reconcileTimerRef.current = undefined;
    }
    return () => {
      isMountedRef.current = false;
      reconcileTimerRef.current = window.setTimeout(() => {
        onCloseRef.current();
      }, 0);
    };
  }, []);

  return (
    <CookLogForm
      variant="light"
      isPending={createMutation.isPending}
      onSkip={() => {
        if (!createMutation.isPending) {
          onClose();
        }
      }}
      onSubmit={input => {
        createMutation.mutate(input);
      }}
    />
  );
};

/**
 * The Recipes screen's host (#130, B7 cluster 5): the design system's
 * RecipesPage renders the screen — collapsed filter bar, bounded list, rows —
 * and this component keeps everything the page must not own: the infinite
 * query, the filter state, navigation, the item mapping above, and the cook-log
 * composition.
 *
 * Two deliberate behavior changes ride with the adoption, both inherited from
 * the page's contract (the app adopted both with @spudly/ui 1.8.0): the list
 * rows no longer offer Delete — deleting a recipe is a recipe-detail action,
 * and the detail page's delete keeps the in-page confirmation and the
 * never-silent failure handling (#263) — and the filters collapse behind the
 * page's "Add a filter" chooser instead of rendering every control at once.
 * Pagination is the page's end-reached signal now; the old view's
 * IntersectionObserver sentinel is gone.
 *
 * @spudly/ui 6.x sectioned contract: the page renders an own section and a
 * discovery section under one filter bar. This host populates only the own
 * section — the user's own recipes, paginated through the own-section load-more
 * props — and passes an empty discovery section (this surface has no discovery
 * feed today; the section collapses to its empty state inside the page). The
 * old flat props map as: `recipes` → `ownRecipes`, `isLoading` → `loadingOwn`,
 * `isFetchingNextPage` → `isFetchingNextOwnPage`, and the host-rendered
 * load-more error alert → `ownLoadMoreErrorMessage` / `onOwnLoadMoreRetry`,
 * which the page renders as the own section's error row.
 */
export const RecipesPage = () => {
  const {filters, controls} = useRecipeListFilters();

  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery(
    recipeListInfiniteQueryOptions(
      params => eciperay.recipes.list(params),
      filters,
    ),
  );

  const recipes = data?.pages.flat() ?? [];

  // A failed FIRST page is not a load-more failure and not an empty
  // list: with no pages loaded the page would otherwise render its
  // empty state for what is actually an error. It crosses as the own
  // section's first-load error (`ownErrorMessage`); once any rows are
  // loaded, a failure is the load-more path below instead.
  const ownErrorMessage =
    isError && recipes.length === 0 ? "Couldn't load your recipes." : null;

  // The shared pagination pattern re-fires onLoadMore when a fetch
  // completes having added no rows (design-system#285) — it cannot
  // tell an empty page from a failed one, so the host gates here: a
  // failed next page latches isFetchNextPageError, automatic loading
  // stops instead of cycling retries, and the own section's load-more
  // error row offers the manual retry.
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchNextPageError, isFetchingNextPage]);

  // The cook-log forms' open state: a set of recipe ids, so forms
  // open and close independently and several may be open at once —
  // the same semantics the old cards' per-card state gave this
  // screen. The page hides the log-cook control of any row whose
  // accessory renders content, so opening a form here reproduces
  // the card's control-hides-while-open behavior.
  const [openCookLogIds, setOpenCookLogIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const openCookLog = (recipeId: string) => {
    setOpenCookLogIds(current => new Set(current).add(recipeId));
  };

  const closeCookLog = (recipeId: string) => {
    setOpenCookLogIds(current => {
      if (!current.has(recipeId)) {
        return current;
      }
      const next = new Set(current);
      next.delete(recipeId);
      return next;
    });
  };

  // Reconcile the open set with the rows actually in the list: when
  // a recipe leaves the list (filtered out, or the loading-to-empty
  // transition), its open id goes with it, so a recipe that later
  // returns comes back closed. The cards got this for free —
  // unmounting a card discarded its open state — but the lifted set
  // has to prune explicitly.
  useEffect(() => {
    setOpenCookLogIds(current => {
      if (current.size === 0) {
        return current;
      }
      const present = new Set(recipes.map(recipe => recipe.id));
      const next = new Set(
        [...current].filter(recipeId => present.has(recipeId)),
      );
      return next.size === current.size ? current : next;
    });
  }, [recipes]);

  const recipesById = new Map(recipes.map(recipe => [recipe.id, recipe]));

  const items: RecipesPageItem[] = recipes.map(recipe => ({
    id: recipe.id,
    href: `/recipes/${recipe.id}`,
    title: recipe.title,
    subtitle: formatRecipesPageSubtitle(recipe),
    rating: getDisplayRating(recipe),
    imageUrl: recipe.imageUrl,
  }));

  return (
    <>
      <h1
        style={{
          margin: 0,
          marginBottom: tokens.spacing[4],
          fontSize: tokens.typography.fontSize['3xl'],
          fontWeight: tokens.typography.fontWeight.bold,
          fontFamily: tokens.typography.fontFamily.sans,
        }}
      >
        Recipes
      </h1>
      <RecipesPageView
        ownTitle="Your recipes"
        ownRecipes={items}
        loadingOwn={isLoading}
        ownErrorMessage={ownErrorMessage}
        isFetchingNextOwnPage={isFetchingNextPage}
        ownLoadMoreErrorMessage={
          isFetchNextPageError ? "Couldn't load more recipes." : null
        }
        onOwnLoadMoreRetry={() => {
          void fetchNextPage();
        }}
        discoveryTitle="Discover"
        discoveryRecipes={[]}
        loadingDiscovery={false}
        onLogCookPress={openCookLog}
        renderRecipeAccessory={recipeId => {
          const recipe = recipesById.get(recipeId);
          if (!recipe || !openCookLogIds.has(recipeId)) {
            return null;
          }
          return (
            <InlineCookLogForm
              key={recipeId}
              recipe={recipe}
              onClose={() => {
                closeCookLog(recipeId);
              }}
            />
          );
        }}
        onLoadMore={handleLoadMore}
        search={controls.search}
        onSearchChange={controls.onSearchChange}
        statusFilter={controls.statusFilter}
        onStatusFilterChange={value => {
          controls.onStatusFilterChange?.(value as RecipeStatusFilterValue);
        }}
        showStatusFilter={controls.showStatusFilter}
        ingredient={controls.ingredient}
        onIngredientChange={controls.onIngredientChange}
        minCalories={controls.minCalories}
        onMinCaloriesChange={controls.onMinCaloriesChange}
        maxCalories={controls.maxCalories}
        onMaxCaloriesChange={controls.onMaxCaloriesChange}
        minSatiety={controls.minSatiety}
        onMinSatietyChange={controls.onMinSatietyChange}
        maxSatiety={controls.maxSatiety}
        onMaxSatietyChange={controls.onMaxSatietyChange}
        sort={controls.sort}
        onSortChange={value => {
          controls.onSortChange(value as RecipeListSort);
        }}
        sortDir={controls.sortDir}
        onSortDirChange={value => {
          controls.onSortDirChange(value as RecipeListSortDir);
        }}
      />
    </>
  );
};
