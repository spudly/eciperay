import {
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
import {RatingForm} from '@spudly/ui';
import {
  RecipesPage as RecipesPageView,
  type RecipesPageItem,
} from '@spudly/ui/pages';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {useCallback, useEffect, useRef, useState} from 'react';

import {eciperay} from '../lib/api.js';

/**
 * The subtitle for a RecipesPage row: servings · time · satiety, with no rating
 * segment — the page renders the rating itself as the row's stars (the log-cook
 * control), so keeping the text would show the rating twice. It mirrors the app
 * host's subtitle (the shared `formatRecipeListSubtitle` minus its rating text)
 * so both hosts present the same meta line on the same page component.
 */
const formatRecipesPageSubtitle = (recipe: RecipeDetail) =>
  `${formatServingsLabel(recipe.servings)}${recipe.cookTimeMin ? ` · ${recipe.cookTimeMin} min` : ''} · ${formatSatietyLabel(recipe.satietyScore, recipe.nutritionStatus)}`;

/**
 * One row's inline cook-log form, rendered through the page's per-row accessory
 * slot — the composition the app host established for this page. The form is
 * the design system's RatingForm (the generalized cook-log form: CookLogForm in
 * @spudly/ui up to 1.14, renamed and generalized in the release this adoption
 * targets), with the notes placeholder carrying the cook-log copy the old web
 * form used. Its submit values map at this boundary: the form's generic
 * `rating` crosses as the cook log's `authorStarRating`.
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
  // doc comment).
  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      onCloseRef.current();
    };
  }, []);

  return (
    <RatingForm
      variant="light"
      notesPlaceholder="Notes from this cook (optional)"
      isPending={createMutation.isPending}
      onSkip={() => {
        if (!createMutation.isPending) {
          onClose();
        }
      }}
      onSubmit={values => {
        createMutation.mutate({
          authorStarRating: values.rating,
          notes: values.notes,
        });
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
 */
export const RecipesPage = () => {
  const {filters, controls} = useRecipeListFilters();

  const {data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} =
    useInfiniteQuery(
      recipeListInfiniteQueryOptions(
        params => eciperay.recipes.list(params),
        filters,
      ),
    );

  const recipes = data?.pages.flat() ?? [];

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

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
    <RecipesPageView
      recipes={items}
      isLoading={isLoading}
      isFetchingNextPage={isFetchingNextPage}
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
  );
};
