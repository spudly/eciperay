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

import {DiscoverPage as DiscoverPageView} from '@spudly/ui';

import {DiscoverPageHead} from '../components/DiscoverPageHead.js';
import {PublicHeader} from '../components/PublicHeader.js';
import {StaticPageHead} from '../components/StaticPageHead.js';
import {eciperay} from '../lib/api.js';

import {sharedFooter} from './legal/legalDocumentData.js';

// The author byline is omitted entirely when the author has no
// display name (#498): "By Anonymous" reads as a named author and
// adds noise, so the subtitle is just the discovery meta.
const formatAuthorName = (authorDisplayName: string | null): string | null => {
  const trimmed = authorDisplayName?.trim();
  return trimmed ? trimmed : null;
};

// The card's subtitle line, composed app-side (the author byline,
// when there is one, plus the discovery meta) exactly as the retired
// web card composed it; the DS page only renders the string.
const toDiscoverItem = (recipe: PublicRecipeDiscoveryItem) => {
  const authorName = formatAuthorName(recipe.authorDisplayName);
  return {
    id: recipe.id,
    title: recipe.title,
    subtitle: `${authorName ? `By ${authorName} · ` : ''}${formatDiscoveryListMeta(recipe)}`,
    imageUrl: recipe.imageUrl,
    href: `/recipe/${recipe.id}/${recipe.slug}`,
  };
};

export const DiscoverPage = () => {
  const {filters, controls} = useRecipeListFilters({
    includeStatus: true,
    defaultSort: 'newest',
  });

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteQuery(
    publicRecipeDiscoveryInfiniteQueryOptions(
      params => eciperay.recipes.listPublic(params),
      filters,
    ),
  );

  const recipes = data?.pages.flat() ?? [];

  return (
    <>
      <StaticPageHead path="/discover" />
      <DiscoverPageHead recipes={recipes} />
      <PublicHeader />
      <DiscoverPageView
        footer={sharedFooter}
        title={DISCOVER_TITLE}
        searchPlaceholder={DISCOVER_SEARCH_PLACEHOLDER}
        emptyMessage={DISCOVER_EMPTY_MESSAGE}
        errorMessage={error ? DISCOVER_ERROR_MESSAGE : null}
        recipes={recipes.map(toDiscoverItem)}
        loading={isLoading}
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
    </>
  );
};
