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

// The FlatList must be bounded to the space the fixed `list` shell leaves it
// (#188): without flex: 1 it sizes to its full content height inside the
// non-scrolling shell, overflows the viewport, and never gets a scrollable
// viewport of its own — the recipes below the fold were unreachable.
const listStyle = {flex: 1} as const;

export const RecipesListView = ({
  isLoading,
  recipes,
  isFetchingNextPage,
  onRecipePress,
  onRecipeDelete,
  onLoadMore,
  ...filterControls
}: RecipesListViewProps) => {
  const filtersBar = <RecipeListFiltersBar {...filterControls} />;

  return (
    <ScreenContainer variant="list">
      {isLoading ? (
        <>
          <YStack
            paddingHorizontal="$4"
            paddingBlockStart="$4"
            paddingBlockEnd="$2"
          >
            {filtersBar}
          </YStack>
          <YStack marginBlockStart="$8">
            <InlineLoadingIndicator loading />
          </YStack>
        </>
      ) : (
        <FlatList
          style={listStyle}
          data={recipes}
          keyExtractor={recipe => recipe.id}
          contentContainerStyle={listContentStyle}
          // The filters render as the list's header so they scroll together
          // with the recipes (#188): the filter form is nearly a viewport
          // tall on its own, so pinning it above a bounded list left the
          // list only a sliver of screen. The header sits inside the list's
          // content container, which already supplies the horizontal
          // padding the standalone wrapper used to add.
          ListHeaderComponent={
            <YStack
              paddingBlockStart="$4"
              paddingBlockEnd="$2"
            >
              {filtersBar}
            </YStack>
          }
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
          ListFooterComponent={
            <ListLoadingFooter loading={isFetchingNextPage} />
          }
        />
      )}
    </ScreenContainer>
  );
};

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
