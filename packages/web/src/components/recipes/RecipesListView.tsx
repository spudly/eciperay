import {type RecipesListViewProps} from '@eciperay/client';

import {RecipeListCard} from '../RecipeListCard.js';
import {InlineLoadingIndicator} from '../InlineLoadingIndicator.js';
import {EmptyMessage} from '../ui/EmptyMessage.js';
import {ListLoadingFooter} from '../ui/ListLoadingFooter.js';
import {PageTitle} from '../ui/PageTitle.js';

import {RecipeListFiltersBar} from './RecipeListFiltersBar.js';

// Scroll parity with the app mirror (#188): on web the filters and the
// cards render in normal page flow, so the page scrolls and every recipe
// stays reachable, and the filters stay mounted across loading
// transitions. The app mirror cannot rely on page scroll (its `list`
// shell is fixed), so it renders the same filters as its FlatList header
// inside a flex-bounded list to get the same effect, keeps that single
// list mounted while loading, and sets keyboardShouldPersistTaps on it
// so filter taps land while the keyboard is open.
//
// Page-view migration (#49, stage 2): the app mirror no longer renders
// its own list — it hosts the design system's RecipesPage
// (@spudly/ui/pages) and keeps only the app-side composition (the item
// mapping, the filter boundary casts, and the cook-log forms rendered
// through the page's per-row accessory slot). This web mirror
// deliberately keeps its DOM implementation — page-flow rendering and
// IntersectionObserver pagination via loadMoreRef; converging web onto
// the DS page is a separate decision.
export const RecipesListView = ({
  isLoading,
  recipes,
  isFetchingNextPage,
  onRecipePress,
  onRecipeDelete,
  loadMoreRef,
  ...filterControls
}: RecipesListViewProps) => (
  <>
    <PageTitle spacing="section">Recipes</PageTitle>
    <RecipeListFiltersBar {...filterControls} />
    {isLoading ? (
      <InlineLoadingIndicator
        loading
        className="mbs-8"
      />
    ) : recipes.length === 0 ? (
      <EmptyMessage spacing="list">No recipes found.</EmptyMessage>
    ) : (
      <>
        {recipes.map(recipe => (
          <RecipeListCard
            key={recipe.id}
            recipe={recipe}
            onPress={() => {
              onRecipePress(recipe.id);
            }}
            onDelete={id => {
              const match = recipes.find(item => item.id === id);
              if (match) {
                onRecipeDelete(match);
              }
            }}
          />
        ))}
        <div
          ref={loadMoreRef}
          className="py-4 text-center"
        >
          <ListLoadingFooter loading={isFetchingNextPage} />
        </div>
      </>
    )}
  </>
);
