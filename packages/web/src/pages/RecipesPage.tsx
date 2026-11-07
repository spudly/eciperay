import {
  DISCOVER_ERROR_MESSAGE,
  formatCondensedNutritionParts,
  formatDiscoveryListMeta,
  formatRecipeListSubtitle,
  formatSatietyLabel,
  formatServingsLabel,
  getDisplayRating,
  invalidateRecipeQueries,
  publicRecipeDiscoveryInfiniteQueryOptions,
  recipeListInfiniteQueryOptions,
  sharedWithMeInfiniteQueryOptions,
  useRecipeListFilters,
  type RecipeStatusFilterValue,
} from '@eciperay/client';
import type {
  CookLogInput,
  PublicRecipeDiscoveryItem,
  RecipeDetail,
  RecipeListSort,
  RecipeListSortDir,
} from '@eciperay/types';
import {tokens} from '@spudly/ui';
import {
  RecipesPage as RecipesPageView,
  type RecipesPageDiscoveryItem,
  type RecipesPageItem,
} from '@spudly/ui';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useSearchParams} from 'react-router-dom';

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

const formatDiscoveryAuthorName = (authorDisplayName: string | null) => {
  if (authorDisplayName?.trim()) {
    return authorDisplayName.trim();
  }
  return 'Anonymous';
};

// One discovery-section row, composed exactly as the signed-out
// Discover host composes its rows (author fallback plus the discovery
// meta line; the DS page only renders the string).
const toDiscoveryItem = (
  recipe: PublicRecipeDiscoveryItem,
): RecipesPageDiscoveryItem => ({
  id: recipe.id,
  title: recipe.title,
  subtitle: `By ${formatDiscoveryAuthorName(recipe.authorDisplayName)} · ${formatDiscoveryListMeta(recipe)}`,
  imageUrl: recipe.imageUrl,
  href: `/recipe/${recipe.id}/${recipe.slug}`,
});

/**
 * The unified Recipes browse (#409, Stephen's approved plan): one page
 * combining the user's own material with preferred placement and the public
 * discovery catalog below it, under the page's one search / filter state. The
 * design system's RecipesPage renders the screen — own section, discovery
 * section, collapsed filter bar — and this host keeps everything the page must
 * not own: the three infinite queries, the filter state, navigation targets,
 * the item mappings, and the cook-log composition.
 *
 * The own section is the user's created recipes followed by the recipes shared
 * with them (each shared row carries the caller-supplied "Shared" badge and
 * keeps its public-permalink destination — the retired standalone
 * Shared-with-me screen's rows were link-only, and they stay that way here:
 * cook logs are owner-only on the server, so the host ignores log-cook presses
 * on shared rows even though the page renders the control for every own-section
 * row). The old flat props map as: created `recipes` → `ownRecipes` (with the
 * shared rows appended), `isLoading` → `loadingOwn`, `isFetchingNextPage` →
 * `isFetchingNextOwnPage`, and the host-rendered load-more error alert →
 * `ownLoadMoreErrorMessage` / `onOwnLoadMoreRetry`, which the page renders as
 * the own section's error row.
 *
 * Pagination: the page's end-reached signal (`onLoadMore`) is the discovery
 * section's continuation in the page's contract, and the own section paginates
 * separately on the host's own queries — so the host's handler continues every
 * query that has a next page, each gated on its own fetch state. A failed next
 * page latches that query's isFetchNextPageError, automatic loading for it
 * stops instead of cycling retries (the shared pagination pattern re-fires
 * onLoadMore when a fetch completes having added no rows, design-system#285,
 * and cannot tell an empty page from a failed one), and the own section's
 * load-more error row offers the manual retry.
 *
 * Header search (Stephen's decision: in scope with the unified browse): the
 * shell's search form navigates here with `?q=<term>`, and this host seeds the
 * page's one search state from that param whenever it changes.
 */
export const RecipesPage = () => {
  const {filters, controls} = useRecipeListFilters();
  const [searchParams] = useSearchParams();
  const headerSearch = searchParams.get('q') ?? '';

  // Seed the page search from the header search's `q` param. The
  // latest onSearchChange, for the seeding effect below: the controls
  // object is rebuilt every render, so the effect cannot depend on
  // the callback itself without re-seeding on every render.
  const onSearchChangeRef = useRef(controls.onSearchChange);
  useEffect(() => {
    onSearchChangeRef.current = controls.onSearchChange;
  });
  useEffect(() => {
    if (headerSearch) {
      onSearchChangeRef.current(headerSearch);
    }
  }, [headerSearch]);

  const ownQuery = useInfiniteQuery(
    recipeListInfiniteQueryOptions(
      params => eciperay.recipes.list(params),
      filters,
    ),
  );
  const sharedQuery = useInfiniteQuery(
    sharedWithMeInfiniteQueryOptions(
      params => eciperay.recipes.listSharedWithMe(params),
      filters,
    ),
  );
  const discoveryQuery = useInfiniteQuery(
    publicRecipeDiscoveryInfiniteQueryOptions(
      params => eciperay.recipes.listPublic(params),
      filters,
    ),
  );

  const ownRecipes = ownQuery.data?.pages.flat() ?? [];
  const sharedRecipes = sharedQuery.data?.pages.flat() ?? [];
  const discoveryRecipes = discoveryQuery.data?.pages.flat() ?? [];

  // A failed FIRST page is not a load-more failure and not an empty
  // list: with no rows loaded the page would otherwise render its
  // empty state for what is actually an error. It crosses as the own
  // section's first-load error (`ownErrorMessage`); once any rows are
  // loaded, a failure is the load-more path below instead. The two
  // own-section queries fail independently — either one's failure
  // surfaces, and neither hides the discovery section.
  const ownSectionFailed = ownQuery.isError || sharedQuery.isError;
  const ownRowCount = ownRecipes.length + sharedRecipes.length;
  const ownErrorMessage =
    ownSectionFailed && ownRowCount === 0
      ? "Couldn't load your recipes."
      : null;
  const ownLoadMoreErrorMessage =
    ownQuery.isFetchNextPageError ||
    sharedQuery.isFetchNextPageError ||
    (ownSectionFailed && ownRowCount > 0)
      ? "Couldn't load more recipes."
      : null;

  const handleOwnLoadMoreRetry = useCallback(() => {
    if (ownQuery.isFetchNextPageError) {
      void ownQuery.fetchNextPage();
    } else if (ownQuery.isError) {
      void ownQuery.refetch();
    }
    if (sharedQuery.isFetchNextPageError) {
      void sharedQuery.fetchNextPage();
    } else if (sharedQuery.isError) {
      void sharedQuery.refetch();
    }
  }, [ownQuery, sharedQuery]);

  const handleLoadMore = useCallback(() => {
    if (
      ownQuery.hasNextPage &&
      !ownQuery.isFetchingNextPage &&
      !ownQuery.isFetchNextPageError
    ) {
      void ownQuery.fetchNextPage();
    }
    if (
      sharedQuery.hasNextPage &&
      !sharedQuery.isFetchingNextPage &&
      !sharedQuery.isFetchNextPageError
    ) {
      void sharedQuery.fetchNextPage();
    }
    if (
      discoveryQuery.hasNextPage &&
      !discoveryQuery.isFetchingNextPage &&
      !discoveryQuery.isFetchNextPageError
    ) {
      void discoveryQuery.fetchNextPage();
    }
  }, [ownQuery, sharedQuery, discoveryQuery]);

  // The cook-log forms' open state: a set of recipe ids, so forms
  // open and close independently and several may be open at once —
  // the same semantics the old cards' per-card state gave this
  // screen. The page hides the log-cook control of any row whose
  // accessory renders content, so opening a form here reproduces
  // the card's control-hides-while-open behavior.
  const [openCookLogIds, setOpenCookLogIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const ownRecipesById = new Map(ownRecipes.map(recipe => [recipe.id, recipe]));

  const openCookLog = (recipeId: string) => {
    // Shared rows are link-only (cook logs are owner-only); the page
    // renders the log-cook control for every own-section row, so
    // presses on shared rows land here and are ignored.
    if (!ownRecipesById.has(recipeId)) {
      return;
    }
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
      const present = new Set(ownRecipes.map(recipe => recipe.id));
      const next = new Set(
        [...current].filter(recipeId => present.has(recipeId)),
      );
      return next.size === current.size ? current : next;
    });
  }, [ownRecipes]);

  const ownItems: RecipesPageItem[] = ownRecipes.map(recipe => ({
    id: recipe.id,
    href: `/recipes/${recipe.id}`,
    title: recipe.title,
    subtitle: formatRecipesPageSubtitle(recipe),
    rating: getDisplayRating(recipe),
    imageUrl: recipe.imageUrl,
  }));

  // Shared-with-me rows, in the shared query's order after the user's
  // own recipes: same subtitle composition the retired shared screen
  // used (its rating stays in the text — these rows have no log-cook
  // rating control), with the shared badge and the public permalink
  // the old card's link pointed at.
  const sharedItems: RecipesPageItem[] = sharedRecipes.map(recipe => ({
    id: recipe.id,
    href: `/recipe/${recipe.id}/${recipe.slug}`,
    title: recipe.title,
    subtitle: formatRecipeListSubtitle(recipe),
    imageUrl: recipe.imageUrl,
    badgeLabel: 'Shared',
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
        ownRecipes={[...ownItems, ...sharedItems]}
        loadingOwn={ownQuery.isLoading || sharedQuery.isLoading}
        ownErrorMessage={ownErrorMessage}
        isFetchingNextOwnPage={
          ownQuery.isFetchingNextPage || sharedQuery.isFetchingNextPage
        }
        ownLoadMoreErrorMessage={ownLoadMoreErrorMessage}
        onOwnLoadMoreRetry={handleOwnLoadMoreRetry}
        discoveryTitle="Discover"
        discoveryRecipes={discoveryRecipes.map(toDiscoveryItem)}
        loadingDiscovery={discoveryQuery.isLoading}
        discoveryErrorMessage={
          discoveryQuery.isError && discoveryRecipes.length === 0
            ? DISCOVER_ERROR_MESSAGE
            : null
        }
        isFetchingNextPage={discoveryQuery.isFetchingNextPage}
        onLogCookPress={openCookLog}
        renderRecipeAccessory={recipeId => {
          const recipe = ownRecipesById.get(recipeId);
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
