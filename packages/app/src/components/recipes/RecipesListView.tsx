import type {RecipesListViewProps} from '@eciperay/client';
import {
  RECIPE_STATUS_FILTER_ALL,
  RECIPE_STATUS_FILTER_LABEL,
  RECIPE_STATUS_LABELS,
  RECIPE_STATUS_OPTIONS,
  makeRecipeDetail,
} from '@eciperay/client';
import {FlatList, StyleSheet, View} from 'react-native';
import {useState} from 'react';

import {RecipeListCard} from '../RecipeListCard';
import {InlineLoadingIndicator} from '../InlineLoadingIndicator';
import {EmptyMessage} from '../ui/EmptyMessage';
import {ListLoadingFooter} from '../ui/ListLoadingFooter';
import {ScreenContainer} from '../ui/ScreenContainer';
import {SearchField} from '../ui/SearchField';
import {SelectField} from '../ui/SelectField';

const styles = StyleSheet.create({
  listContent: {paddingHorizontal: 16, paddingBottom: 32},
});

export const RecipesListView = ({
  search,
  onSearchChange,
  isLoading,
  recipes,
  isFetchingNextPage,
  onRecipePress,
  onRecipeDelete,
  onLoadMore,
  statusFilter,
  onStatusFilterChange,
}: RecipesListViewProps) => (
  <ScreenContainer variant="list">
    <View className="px-4 pb-2 pt-4">
      <SearchField
        value={search}
        onChange={onSearchChange}
      />
      {statusFilter !== undefined && onStatusFilterChange ? (
        <SelectField
          label={RECIPE_STATUS_FILTER_LABEL}
          value={statusFilter}
          options={[
            {value: RECIPE_STATUS_FILTER_ALL, label: 'All statuses'},
            ...RECIPE_STATUS_OPTIONS.map(status => ({
              value: status,
              label: RECIPE_STATUS_LABELS[status],
            })),
          ]}
          onChange={next => {
            onStatusFilterChange(next as typeof statusFilter);
          }}
        />
      ) : null}
    </View>
    {isLoading ? (
      <InlineLoadingIndicator
        loading
        className="mt-8"
      />
    ) : (
      <FlatList
        data={recipes}
        keyExtractor={recipe => recipe.id}
        contentContainerStyle={styles.listContent}
        renderItem={({item}) => (
          <RecipeListCard
            recipe={item}
            onPress={() => {
              onRecipePress(item.id);
            }}
            onDelete={() => {
              onRecipeDelete(item);
            }}
          />
        )}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <EmptyMessage spacing="list">No recipes found.</EmptyMessage>
        }
        ListFooterComponent={<ListLoadingFooter loading={isFetchingNextPage} />}
      />
    )}
  </ScreenContainer>
);

if (__DEV__) {
  const RecipesListViewDemo = () => {
    const [search, setSearch] = useState('');

    return (
      <RecipesListView
        search={search}
        onSearchChange={setSearch}
        isLoading={false}
        recipes={[makeRecipeDetail()]}
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

  RecipesListView.demo = () => <RecipesListViewDemo />;
}
