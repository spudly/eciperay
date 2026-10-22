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
      <FlatList
        style={listStyle}
        // The filter controls live inside this scroll view, so taps on
        // them must land while the keyboard is open instead of being
        // consumed to dismiss it — the same reason the form shells set
        // this on their ScrollView (see ui/ScreenContainer).
        keyboardShouldPersistTaps="handled"
        data={isLoading ? [] : recipes}
        keyExtractor={recipe => recipe.id}
        contentContainerStyle={listContentStyle}
        // The filters render as the list's header so they scroll together
        // with the recipes (#188): the filter form is nearly a viewport
        // tall on its own, so pinning it above a bounded list left the
        // list only a sliver of screen. The header sits inside the list's
        // content container, which already supplies the horizontal
        // padding a standalone wrapper would add. The list (and therefore
        // the header) stays mounted while loading — the screens' queries
        // keep no previous data, so a filter edit flips isLoading and a
        // tree swap here would unmount the focused filter input
        // mid-typing; the loading indicator renders as the list's empty
        // state instead.
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
          isLoading ? (
            <YStack marginBlockStart="$8">
              <InlineLoadingIndicator loading />
            </YStack>
          ) : (
            <EmptyMessage spacing="list">No recipes found.</EmptyMessage>
          )
        }
        ListFooterComponent={<ListLoadingFooter loading={isFetchingNextPage} />}
      />
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
