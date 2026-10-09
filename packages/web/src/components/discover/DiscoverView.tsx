import type {PublicRecipeDiscoveryItem} from '@eciperay/types';
import type {RecipeListFilterControls} from '@eciperay/client';

import {EmptyMessage} from '../ui/EmptyMessage.js';
import {InlineLoadingIndicator} from '../InlineLoadingIndicator.js';
import {ListLoadingFooter} from '../ui/ListLoadingFooter.js';
import {PageTitle} from '../ui/PageTitle.js';
import {PublicRecipeDiscoveryCard} from '../PublicRecipeDiscoveryCard.js';
import {RecipeListFiltersBar} from '../recipes/RecipeListFiltersBar.js';

export type DiscoverViewProps = RecipeListFilterControls & {
  title: string;
  searchPlaceholder: string;
  recipes: PublicRecipeDiscoveryItem[];
  loading: boolean;
  loadingMore: boolean;
  emptyMessage: string;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
};

export const DiscoverView = ({
  title,
  searchPlaceholder,
  recipes,
  loading,
  loadingMore,
  emptyMessage,
  loadMoreRef,
  ...filterControls
}: DiscoverViewProps) => (
  <div>
    <PageTitle spacing="section">{title}</PageTitle>
    <RecipeListFiltersBar
      {...filterControls}
      searchPlaceholder={searchPlaceholder}
    />
    {loading ? (
      <InlineLoadingIndicator loading />
    ) : recipes.length === 0 ? (
      <EmptyMessage spacing="list">{emptyMessage}</EmptyMessage>
    ) : (
      <>
        {recipes.map(recipe => (
          <PublicRecipeDiscoveryCard
            key={recipe.id}
            recipe={recipe}
          />
        ))}
        <div ref={loadMoreRef}>
          <ListLoadingFooter loading={loadingMore} />
        </div>
      </>
    )}
  </div>
);
