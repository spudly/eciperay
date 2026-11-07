import {
  SHARED_WITH_ME_EMPTY_BODY,
  SHARED_WITH_ME_EMPTY_TITLE,
  SHARED_WITH_ME_TITLE,
  formatRecipeListSubtitle,
  sharedWithMeInfiniteQueryOptions,
  useRecipeListFilters,
  type RecipeStatusFilterValue,
} from '@eciperay/client';
import type {RecipeListSort, RecipeListSortDir} from '@eciperay/types';
import {tokens} from '@spudly/ui';
import {RecipesPage as RecipesPageView, type RecipesPageItem} from '@spudly/ui';
import {useInfiniteQuery} from '@tanstack/react-query';
import {useCallback} from 'react';

import {eciperay} from '../lib/api.js';

/**
 * The Shared-with-me screen's host (#130, B7 cluster 5): since the design
 * system's #185 consolidation, this screen is the same RecipesPage as the
 * Recipes screen in its shared configuration — link-only rows (no log-cook
 * control, no accessory) and this screen's own empty-state copy — and this
 * component keeps what the page must not own: the infinite query, the filter
 * state, and the row destinations.
 *
 * The row destination is the one behavior this screen has that Recipes does
 * not: a shared recipe opens at its public permalink, so each item's `href` is
 * the permalink path (`/recipe/:id/:slug`) — exactly where the old card's link
 * pointed. Pagination is the page's end-reached signal now; the old view's
 * IntersectionObserver sentinel is gone.
 *
 * @spudly/ui 6.x sectioned contract: the page renders an own section and a
 * discovery section under one filter bar. This host's recipes are the shared
 * ones, so they populate the own section — each item carrying the
 * caller-supplied `badgeLabel` that distinguishes shared-with-me content inside
 * the own section — with this screen's empty copy passed through
 * `ownEmptyTitle` / `ownEmptyBody`, and an empty discovery section (this
 * surface has no discovery feed). The old flat props map as: `recipes` →
 * `ownRecipes`, `isLoading` → `loadingOwn`, `isFetchingNextPage` →
 * `isFetchingNextOwnPage`, `emptyTitle` / `emptyBody` → `ownEmptyTitle` /
 * `ownEmptyBody`, and the host-rendered load-more error alert →
 * `ownLoadMoreErrorMessage` / `onOwnLoadMoreRetry`, which the page renders as
 * the own section's error row.
 */
export const SharedWithMePage = () => {
  const {filters, controls} = useRecipeListFilters();

  const {
    data,
    isLoading,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery(
    sharedWithMeInfiniteQueryOptions(
      params => eciperay.recipes.listSharedWithMe(params),
      filters,
    ),
  );

  const recipes = data?.pages.flat() ?? [];

  // Same pagination-error gate as the Recipes host: the shared
  // pagination pattern re-fires onLoadMore when a fetch adds no rows
  // and cannot tell an empty page from a failed one, so a failed next
  // page stops automatic loading here and the own section's load-more
  // error row offers the manual retry.
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchNextPageError, isFetchingNextPage]);

  const items: RecipesPageItem[] = recipes.map(recipe => ({
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
        {SHARED_WITH_ME_TITLE}
      </h1>
      <RecipesPageView
        ownTitle="Shared with you"
        ownRecipes={items}
        loadingOwn={isLoading}
        isFetchingNextOwnPage={isFetchingNextPage}
        ownLoadMoreErrorMessage={
          isFetchNextPageError ? "Couldn't load more recipes." : null
        }
        onOwnLoadMoreRetry={() => {
          void fetchNextPage();
        }}
        ownEmptyTitle={SHARED_WITH_ME_EMPTY_TITLE}
        ownEmptyBody={SHARED_WITH_ME_EMPTY_BODY}
        discoveryTitle="Discover"
        discoveryRecipes={[]}
        loadingDiscovery={false}
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
