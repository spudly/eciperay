import {
  SHARED_WITH_ME_EMPTY_BODY,
  SHARED_WITH_ME_EMPTY_TITLE,
  formatRecipeListSubtitle,
  sharedWithMeInfiniteQueryOptions,
  useRecipeListFilters,
  type RecipeStatusFilterValue,
} from '@eciperay/client';
import type {RecipeListSort, RecipeListSortDir} from '@eciperay/types';
import {
  RecipesPage as RecipesPageView,
  type RecipesPageItem,
} from '@spudly/ui/pages';
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
 */
export const SharedWithMePage = () => {
  const {filters, controls} = useRecipeListFilters();

  const {data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} =
    useInfiniteQuery(
      sharedWithMeInfiniteQueryOptions(
        params => eciperay.recipes.listSharedWithMe(params),
        filters,
      ),
    );

  const recipes = data?.pages.flat() ?? [];

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const items: RecipesPageItem[] = recipes.map(recipe => ({
    id: recipe.id,
    href: `/recipe/${recipe.id}/${recipe.slug}`,
    title: recipe.title,
    subtitle: formatRecipeListSubtitle(recipe),
    imageUrl: recipe.imageUrl,
  }));

  return (
    <RecipesPageView
      recipes={items}
      isLoading={isLoading}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={handleLoadMore}
      emptyTitle={SHARED_WITH_ME_EMPTY_TITLE}
      emptyBody={SHARED_WITH_ME_EMPTY_BODY}
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
