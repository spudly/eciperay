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
        className="mt-8"
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
