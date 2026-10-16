import type {RecipesListViewProps} from '@eciperay/client';
import {demoRecipeListFilters, makeRecipeDetail} from '@eciperay/client';
import {tokens} from '@spudly/ui';
import {FlatList} from 'react-native';
import {useState} from 'react';
import {YStack} from 'tamagui';

import {RecipeListCard} from '../RecipeListCard';
import {InlineLoadingIndicator} from '../InlineLoadingIndicator';
import {EmptyMessage} from '../ui/EmptyMessage';
import {ListLoadingFooter} from '../ui/ListLoadingFooter';
import {ScreenContainer} from '../ui/ScreenContainer';

import {RecipeListFiltersBar} from './RecipeListFiltersBar';

// List content geometry on the DS spacing scale (plain object, no StyleSheet —
// the recipeImagePreviewStyles precedent).
const listContentStyle = {
  paddingHorizontal: tokens.spacing[4],
  paddingBottom: tokens.spacing[8],
} as const;

export const RecipesListView = ({
  isLoading,
  recipes,
  isFetchingNextPage,
  onRecipePress,
  onRecipeDelete,
  onLoadMore,
  ...filterControls
}: RecipesListViewProps) => (
  <ScreenContainer variant="list">
    <YStack
      paddingHorizontal="$4"
      paddingBlockStart="$4"
      paddingBlockEnd="$2"
    >
      <RecipeListFiltersBar {...filterControls} />
    </YStack>
    {isLoading ? (
      <YStack marginBlockStart="$8">
        <InlineLoadingIndicator loading />
      </YStack>
    ) : (
      <FlatList
        data={recipes}
        keyExtractor={recipe => recipe.id}
        contentContainerStyle={listContentStyle}
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
        {...demoRecipeListFilters()}
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
