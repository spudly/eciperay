import {
  DISCOVER_EMPTY_MESSAGE,
  DISCOVER_ERROR_MESSAGE,
  DISCOVER_SEARCH_PLACEHOLDER,
  DISCOVER_TITLE,
  formatDiscoveryListMeta,
  publicRecipeDiscoveryInfiniteQueryOptions,
  useRecipeListFilters,
  type RecipeStatusFilterValue,
} from '@eciperay/client';
import type {
  PublicRecipeDiscoveryItem,
  RecipeListSort,
  RecipeListSortDir,
} from '@eciperay/types';
import {useInfiniteQuery} from '@tanstack/react-query';

import {
  DiscoverPage as DiscoverPageView,
  PublicPageFrame,
} from '@spudly/ui/pages';

import {eciperay} from '../lib/api.js';

const formatAuthorName = (authorDisplayName: string | null) => {
  if (authorDisplayName?.trim()) {
    return authorDisplayName.trim();
  }
  return 'Anonymous';
};

// The card's subtitle line, composed app-side (the author fallback
// plus the discovery meta) exactly as the retired web card composed
// it; the DS page only renders the string.
const toDiscoverItem = (recipe: PublicRecipeDiscoveryItem) => ({
  id: recipe.id,
  title: recipe.title,
  subtitle: `By ${formatAuthorName(recipe.authorDisplayName)} · ${formatDiscoveryListMeta(recipe)}`,
  imageUrl: recipe.imageUrl,
  href: `/recipe/${recipe.id}/${recipe.slug}`,
});

export const DiscoverPage = () => {
  const {filters, controls} = useRecipeListFilters({
    includeStatus: true,
    defaultSort: 'newest',
  });

  const {data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error} =
    useInfiniteQuery(
      publicRecipeDiscoveryInfiniteQueryOptions(
        params => eciperay.recipes.listPublic(params),
        filters,
      ),
    );

  const recipes = data?.pages.flat() ?? [];

  return (
    <PublicPageFrame
      brandHref="/"
      signInHref="/login"
      privacyHref="/privacy"
      termsHref="/terms"
    >
      <DiscoverPageView
        title={DISCOVER_TITLE}
        searchPlaceholder={DISCOVER_SEARCH_PLACEHOLDER}
        emptyMessage={DISCOVER_EMPTY_MESSAGE}
        errorMessage={error ? DISCOVER_ERROR_MESSAGE : null}
        recipes={recipes.map(toDiscoverItem)}
        isLoading={isLoading}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => {
          if (hasNextPage) {
            void fetchNextPage();
          }
        }}
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
    </PublicPageFrame>
  );
};
