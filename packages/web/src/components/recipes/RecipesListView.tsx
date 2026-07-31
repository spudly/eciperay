import {
  RECIPE_STATUS_FILTER_ALL,
  RECIPE_STATUS_FILTER_LABEL,
  RECIPE_STATUS_LABELS,
  RECIPE_STATUS_OPTIONS,
  type RecipesListViewProps,
} from '@eciperay/client';
import {makeRecipeDetail} from '@eciperay/client';
import {useState} from 'react';

import {RecipeListCard} from '../RecipeListCard.js';
import {InlineLoadingIndicator} from '../InlineLoadingIndicator.js';
import {EmptyMessage} from '../ui/EmptyMessage.js';
import {ListLoadingFooter} from '../ui/ListLoadingFooter.js';
import {PageTitle} from '../ui/PageTitle.js';
import {SearchField} from '../ui/SearchField.js';

export const RecipesListView = ({
  search,
  onSearchChange,
  isLoading,
  recipes,
  isFetchingNextPage,
  onRecipePress,
  onRecipeDelete,
  statusFilter,
  onStatusFilterChange,
  loadMoreRef,
}: RecipesListViewProps) => (
  <>
    <PageTitle spacing="section">Recipes</PageTitle>
    <SearchField
      value={search}
      onChange={onSearchChange}
    />
    {statusFilter !== undefined && onStatusFilterChange ? (
      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium text-gray-700">
          {RECIPE_STATUS_FILTER_LABEL}
        </span>
        <select
          className="ui-select-field"
          value={statusFilter}
          onChange={event => {
            onStatusFilterChange(event.target.value as typeof statusFilter);
          }}
        >
          <option value={RECIPE_STATUS_FILTER_ALL}>All statuses</option>
          {RECIPE_STATUS_OPTIONS.map(status => (
            <option
              key={status}
              value={status}
            >
              {RECIPE_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>
    ) : null}
    {isLoading ? (
      <InlineLoadingIndicator
        loading
        className="mt-8"
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

if (import.meta.env.DEV) {
  RecipesListView.demo = function RecipesListViewDemo() {
    const [search, setSearch] = useState('');
    const mockRecipe = makeRecipeDetail();

    return (
      <RecipesListView
        search={search}
        onSearchChange={setSearch}
        isLoading={false}
        recipes={[mockRecipe]}
        isFetchingNextPage={false}
        onRecipePress={() => {
          void 0;
        }}
        onRecipeDelete={() => {
          void 0;
        }}
        onLoadMore={() => {
          void 0;
        }}
      />
    );
  };
}
