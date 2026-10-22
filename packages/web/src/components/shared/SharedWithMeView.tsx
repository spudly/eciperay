import {
  SHARED_WITH_ME_EMPTY_MESSAGE,
  SHARED_WITH_ME_TITLE,
  demoRecipeListFilters,
  makeRecipeDetail,
  type SharedWithMeViewProps,
} from '@eciperay/client';

import {SharedRecipeListCard} from '../SharedRecipeListCard.js';
import {InlineLoadingIndicator} from '../InlineLoadingIndicator.js';
import {EmptyMessage} from '../ui/EmptyMessage.js';
import {ListLoadingFooter} from '../ui/ListLoadingFooter.js';
import {PageTitle} from '../ui/PageTitle.js';
import {RecipeListFiltersBar} from '../recipes/RecipeListFiltersBar.js';

// Scroll parity with the app mirror (#188): on web the filters and the
// cards render in normal page flow, so the page scrolls and every recipe
// stays reachable, and the filters stay mounted across loading
// transitions. The app mirror cannot rely on page scroll (its `list`
// shell is fixed), so it renders the same filters as its FlatList header
// inside a flex-bounded list to get the same effect, keeps that single
// list mounted while loading, and sets keyboardShouldPersistTaps on it
// so filter taps land while the keyboard is open.
export const SharedWithMeView = ({
  isLoading,
  recipes,
  isFetchingNextPage,
  showTitle = true,
  loadMoreRef,
  ...filterControls
}: SharedWithMeViewProps) => (
  <>
    {showTitle ? (
      <PageTitle spacing="section">{SHARED_WITH_ME_TITLE}</PageTitle>
    ) : null}
    <RecipeListFiltersBar {...filterControls} />
    {isLoading ? (
      <InlineLoadingIndicator
        loading
        className="mbs-8"
      />
    ) : recipes.length === 0 ? (
      <EmptyMessage spacing="list">{SHARED_WITH_ME_EMPTY_MESSAGE}</EmptyMessage>
    ) : (
      <>
        {recipes.map(recipe => (
          <SharedRecipeListCard
            key={recipe.id}
            recipe={recipe}
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

if (import.meta.env.DEV) {
  SharedWithMeView.demo = function SharedWithMeViewDemo() {
    const mockRecipe = makeRecipeDetail();

    return (
      <SharedWithMeView
        {...demoRecipeListFilters()}
        isLoading={false}
        recipes={[mockRecipe]}
        isFetchingNextPage={false}
        onLoadMore={() => {
          void 0;
        }}
      />
    );
  };
}
