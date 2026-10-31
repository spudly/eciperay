import {
  buildRecipePermalink,
  formatRecipeListSubtitle,
  SHARED_WITH_ME_EMPTY_BODY,
  SHARED_WITH_ME_EMPTY_TITLE,
  WEB_APP_BASE_URL,
  type RecipeStatusFilterValue,
  type SharedWithMeViewProps,
} from '@eciperay/client';
import type {RecipeListSort, RecipeListSortDir} from '@eciperay/types';
import {RecipesPage, type RecipesPageItem} from '@spudly/ui/pages';

/**
 * The Shared-with-me screen's view (#49, Wave A): the design system's
 * recipes-list page renders the screen — filter bar, bounded list, rows — and
 * this component is its app-side host. Everything the page must not own stays
 * here: the view-model mapping (the subtitle is the app's list meta line,
 * formatted by the same helper the shared card uses) and the boundary
 * adaptations (the filter unions narrow back from the page's plain strings with
 * the same casts the old filter bar used).
 *
 * Until @spudly/ui 1.15.0 this host drove a dedicated SharedWithMePage; the
 * design system consolidated the two list screens into RecipesPage
 * (design-system#119), so this host now drives that page in its shared-with-me
 * configuration: no log-cook control and no per-row accessory (shared rows are
 * press-only), and the screen's own empty-state copy through the page's
 * emptyTitle/emptyBody props.
 *
 * The row destination is the one piece of behavior this screen has that Recipes
 * does not: a shared recipe is not the viewer's to open in-app, so each row's
 * `href` is the recipe's permalink, built from the app's base-URL constant — on
 * native the page's link opens it through Linking, exactly what this host (and
 * SharedRecipeListCard before it) did by hand with the row press.
 *
 * The layout regressions the old hand-rolled list guarded in this file — #188
 * (bounded flex: 1 list, filters as its header, the list mounted while loading
 * so a filter edit cannot unmount the focused input) and #162 (the DS
 * SearchField untouched) — are structural in the DS page now; the view tests
 * here still pin the rendered contract (bounded scroll view, header filters,
 * element presence).
 */
export const SharedWithMeView = ({
  isLoading,
  recipes,
  isFetchingNextPage,
  onLoadMore,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  ingredient,
  onIngredientChange,
  minCalories,
  onMinCaloriesChange,
  maxCalories,
  onMaxCaloriesChange,
  minSatiety,
  onMinSatietyChange,
  maxSatiety,
  onMaxSatietyChange,
  sort,
  onSortChange,
  sortDir,
  onSortDirChange,
  showStatusFilter,
}: SharedWithMeViewProps) => {
  const items: RecipesPageItem[] = recipes.map(recipe => ({
    id: recipe.id,
    href: buildRecipePermalink(WEB_APP_BASE_URL, recipe),
    title: recipe.title,
    subtitle: formatRecipeListSubtitle(recipe),
    imageUrl: recipe.imageUrl,
  }));

  return (
    <RecipesPage
      recipes={items}
      isLoading={isLoading}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={onLoadMore}
      emptyTitle={SHARED_WITH_ME_EMPTY_TITLE}
      emptyBody={SHARED_WITH_ME_EMPTY_BODY}
      search={search}
      onSearchChange={onSearchChange}
      statusFilter={statusFilter}
      onStatusFilterChange={
        onStatusFilterChange
          ? value => {
              onStatusFilterChange(value as RecipeStatusFilterValue);
            }
          : undefined
      }
      showStatusFilter={showStatusFilter}
      ingredient={ingredient}
      onIngredientChange={onIngredientChange}
      minCalories={minCalories}
      onMinCaloriesChange={onMinCaloriesChange}
      maxCalories={maxCalories}
      onMaxCaloriesChange={onMaxCaloriesChange}
      minSatiety={minSatiety}
      onMinSatietyChange={onMinSatietyChange}
      maxSatiety={maxSatiety}
      onMaxSatietyChange={onMaxSatietyChange}
      sort={sort}
      onSortChange={value => {
        onSortChange(value as RecipeListSort);
      }}
      sortDir={sortDir}
      onSortDirChange={value => {
        onSortDirChange(value as RecipeListSortDir);
      }}
    />
  );
};
