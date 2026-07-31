import type {PublicRecipeDiscoveryItem} from '@eciperay/types';

import {EmptyMessage} from '../ui/EmptyMessage.js';
import {InlineLoadingIndicator} from '../InlineLoadingIndicator.js';
import {ListLoadingFooter} from '../ui/ListLoadingFooter.js';
import {PageTitle} from '../ui/PageTitle.js';
import {SearchField} from '../ui/SearchField.js';
import {PublicRecipeDiscoveryCard} from '../PublicRecipeDiscoveryCard.js';

export type DiscoverViewProps = {
  title: string;
  searchPlaceholder: string;
  search: string;
  onSearchChange: (value: string) => void;
  recipes: PublicRecipeDiscoveryItem[];
  loading: boolean;
  loadingMore: boolean;
  emptyMessage: string;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
};

export const DiscoverView = ({
  title,
  searchPlaceholder,
  search,
  onSearchChange,
  recipes,
  loading,
  loadingMore,
  emptyMessage,
  loadMoreRef,
}: DiscoverViewProps) => (
  <div>
    <PageTitle spacing="section">{title}</PageTitle>
    <SearchField
      placeholder={searchPlaceholder}
      value={search}
      onChange={onSearchChange}
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
