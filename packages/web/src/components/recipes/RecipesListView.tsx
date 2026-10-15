import {type RecipesListViewProps} from '@eciperay/client';

import {RecipeListCard} from '../RecipeListCard.js';
import {InlineLoadingIndicator} from '../InlineLoadingIndicator.js';
import {EmptyMessage} from '../ui/EmptyMessage.js';
import {ListLoadingFooter} from '../ui/ListLoadingFooter.js';
import {PageTitle} from '../ui/PageTitle.js';

import {RecipeListFiltersBar} from './RecipeListFiltersBar.js';

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
