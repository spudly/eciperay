import {
  SHARED_WITH_ME_EMPTY_MESSAGE,
  demoRecipeListFilters,
  makeRecipeDetail,
  type SharedWithMeViewProps,
} from '@eciperay/client';
import {tokens} from '@spudly/ui';
import {FlatList} from 'react-native';
import {YStack} from 'tamagui';

import {SharedRecipeListCard} from '../SharedRecipeListCard';
import {InlineLoadingIndicator} from '../InlineLoadingIndicator';
import {EmptyMessage} from '../ui/EmptyMessage';
import {ListLoadingFooter} from '../ui/ListLoadingFooter';
import {ScreenContainer} from '../ui/ScreenContainer';
import {RecipeListFiltersBar} from '../recipes/RecipeListFiltersBar';

// List content geometry on the DS spacing scale (plain object, no
// StyleSheet — the RecipesListView precedent).
const listContentStyle = {
  paddingHorizontal: tokens.spacing[4],
  paddingBottom: tokens.spacing[8],
} as const;

// Same bounded-list contract as RecipesListView (#188): without flex: 1 the
// FlatList sizes to its full content height inside the fixed `list` shell
// and never gets a scrollable viewport of its own.
const listStyle = {flex: 1} as const;

export const SharedWithMeView = ({
  isLoading,
  recipes,
  isFetchingNextPage,
  onLoadMore,
  ...filterControls
}: SharedWithMeViewProps) => {
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
        // Filters as the list header, scrolling with the recipes — the
        // #188 fix applied to RecipesListView; this screen has the same
        // filter form and the same fixed shell. The header sits inside
        // the list's content container, which already supplies the
        // horizontal padding a standalone wrapper would add. The list
        // (and therefore the header) stays mounted while loading, so a
        // filter edit that flips isLoading cannot unmount the focused
        // filter input mid-typing; the loading indicator renders as the
        // list's empty state instead.
        ListHeaderComponent={
          <YStack
            paddingBlockStart="$4"
            paddingBlockEnd="$2"
          >
            {filtersBar}
          </YStack>
        }
        renderItem={({item}) => <SharedRecipeListCard recipe={item} />}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          isLoading ? (
            <YStack marginBlockStart="$8">
              <InlineLoadingIndicator loading />
            </YStack>
          ) : (
            <EmptyMessage spacing="list">
              {SHARED_WITH_ME_EMPTY_MESSAGE}
            </EmptyMessage>
          )
        }
        ListFooterComponent={<ListLoadingFooter loading={isFetchingNextPage} />}
      />
    </ScreenContainer>
  );
};

if (__DEV__) {
  SharedWithMeView.demo = () => (
    <SharedWithMeView
      {...demoRecipeListFilters()}
      isLoading={false}
      recipes={[makeRecipeDetail()]}
      isFetchingNextPage={false}
      onLoadMore={() => {
        void 0;
      }}
    />
  );
}
