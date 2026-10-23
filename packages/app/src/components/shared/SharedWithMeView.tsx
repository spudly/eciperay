import {
  buildRecipePermalink,
  demoRecipeListFilters,
  makeRecipeDetail,
  WEB_APP_BASE_URL,
  type RecipeStatusFilterValue,
  type SharedWithMeViewProps,
} from '@eciperay/client';
import type {RecipeListSort, RecipeListSortDir} from '@eciperay/types';
import {SharedWithMePage, type SharedWithMePageItem} from '@spudly/ui/pages';
import {Linking} from 'react-native';

import {formatRecipeSubtitle} from '../SharedRecipeListCard';

/**
 * The Shared-with-me screen's view (#49, Wave A): the design system's
 * SharedWithMePage renders the screen — filter bar, bounded list, rows — and
 * this component is its app-side host. Everything the page must not own stays
 * here: the view-model mapping (the subtitle is the app's list meta line,
 * formatted by the same helper the shared card uses), the row press, and the
 * boundary adaptations (the filter unions narrow back from the page's plain
 * strings with the same casts the old filter bar used).
 *
 * The row press is the one piece of behavior this screen has that Recipes does
 * not: a shared recipe is not the viewer's to open in-app, so the press opens
 * the recipe's permalink in the browser. The page reports the press by id; the
 * host resolves the recipe from the app's own list, builds the permalink from
 * the app's base-URL constant, and hands it to Linking — exactly what
 * SharedRecipeListCard did per card.
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
  const recipesById = new Map(recipes.map(recipe => [recipe.id, recipe]));

  const items: SharedWithMePageItem[] = recipes.map(recipe => ({
    id: recipe.id,
    title: recipe.title,
    subtitle: formatRecipeSubtitle(recipe),
    imageUrl: recipe.imageUrl,
  }));

  return (
    <SharedWithMePage
      recipes={items}
      isLoading={isLoading}
      isFetchingNextPage={isFetchingNextPage}
      onRecipePress={recipeId => {
        const recipe = recipesById.get(recipeId);
        if (recipe) {
          void Linking.openURL(buildRecipePermalink(WEB_APP_BASE_URL, recipe));
        }
      }}
      onLoadMore={onLoadMore}
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

if (__DEV__) {
  SharedWithMeView.demo = () => (
    <SharedWithMeView
      {...demoRecipeListFilters()}
      isLoading={false}
      recipes={[makeRecipeDetail()]}
      isFetchingNextPage={false}
      onLoadMore={() => {
        void 0;
      }}
    />
  );
}
