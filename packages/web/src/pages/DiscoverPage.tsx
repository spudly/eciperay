import {
  formatDiscoveryListMeta,
  publicRecipeDiscoveryInfiniteQueryOptions,
  resizedImageUrl,
  RECIPE_STATUS_FILTER_ALL,
  useRecipeListFilters,
  type RecipeStatusFilterValue,
} from '@eciperay/client';
import {useLingui} from '@lingui/react';
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
// web card composed it; the DS page only renders the string. The
// no-ratings label is resolved by the host (below) and passed into
// the non-React `formatDiscoveryListMeta` helper, which otherwise
// defaults to the shared `DISCOVER_NO_RATINGS_LABEL` constant for
// its other (native / recipes-list) callers.
const toDiscoverItem = (
  recipe: PublicRecipeDiscoveryItem,
  noRatingsLabel: string,
) => {
  const authorName = formatAuthorName(recipe.authorDisplayName);
  return {
    id: recipe.id,
    title: recipe.title,
    subtitle: `${authorName ? `By ${authorName} · ` : ''}${formatDiscoveryListMeta(recipe, noRatingsLabel)}`,
    imageUrl: resizedImageUrl(recipe.imageUrl, 400),
    href: `/recipe/${recipe.id}/${recipe.slug}`,
  };
};

// This page's page-unique copy flows through the Lingui catalogs
// (#465 tranche 7: explicit ids `discover.title` /
// `discover.searchPlaceholder` / `discover.emptyMessage` /
// `discover.emptyFeedMessage` / `discover.errorMessage` /
// `discover.noRatingsLabel`) instead of
// the shared `discoverCopy` constants. The constants remain in
// @eciperay/client for their other consumers (the SEO page-head
// title, the recipes-list error state, and the native screens),
// which are separate tranches.
export const DiscoverPage = () => {
  const {i18n} = useLingui();
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
        title={i18n._({id: 'discover.title', message: 'Discover recipes'})}
        searchPlaceholder={i18n._({
          id: 'discover.searchPlaceholder',
          message: 'Search public recipes…',
        })}
        emptyMessage={
          controls.search.trim()
            ? i18n._({
                id: 'discover.emptyMessage',
                message:
                  'No public recipes match that search — try a broader craving.',
              })
            : controls.ingredient.trim() ||
                (controls.statusFilter &&
                  controls.statusFilter !== RECIPE_STATUS_FILTER_ALL) ||
                controls.minCalories.trim() ||
                controls.maxCalories.trim() ||
                controls.minSatiety.trim() ||
                controls.maxSatiety.trim()
              ? i18n._({
                  id: 'discover.emptyFilterMessage',
                  message:
                    'No public recipes match those filters — try broadening them.',
                })
              : i18n._({
                  id: 'discover.emptyFeedMessage',
                  message:
                    'No public recipes yet — new dishes show up here as cooks share them.',
                })
        }
        errorMessage={
          error
            ? i18n._({
                id: 'discover.errorMessage',
                message:
                  "We couldn't load public recipes. Check your connection and try again.",
              })
            : null
        }
        recipes={recipes.map(recipe =>
          toDiscoverItem(
            recipe,
            i18n._({
              id: 'discover.noRatingsLabel',
              message: 'No ratings yet',
            }),
          ),
        )}
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
