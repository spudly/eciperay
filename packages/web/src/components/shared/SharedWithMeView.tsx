import {
  SHARED_WITH_ME_EMPTY_MESSAGE,
  SHARED_WITH_ME_TITLE,
  type SharedWithMeViewProps,
} from '@eciperay/client';
import {makeRecipeDetail} from '@eciperay/client';

import {SharedRecipeListCard} from '../SharedRecipeListCard.js';
import {InlineLoadingIndicator} from '../InlineLoadingIndicator.js';
import {EmptyMessage} from '../ui/EmptyMessage.js';
import {ListLoadingFooter} from '../ui/ListLoadingFooter.js';
import {PageTitle} from '../ui/PageTitle.js';

export const SharedWithMeView = ({
  isLoading,
  recipes,
  isFetchingNextPage,
  showTitle = true,
  loadMoreRef,
}: SharedWithMeViewProps) => (
  <>
    {showTitle ? (
      <PageTitle spacing="section">{SHARED_WITH_ME_TITLE}</PageTitle>
    ) : null}
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
