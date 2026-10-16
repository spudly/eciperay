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

export const SharedWithMeView = ({
  isLoading,
  recipes,
  isFetchingNextPage,
  onLoadMore,
  ...filterControls
}: SharedWithMeViewProps) => (
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
        renderItem={({item}) => <SharedRecipeListCard recipe={item} />}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <EmptyMessage spacing="list">
            {SHARED_WITH_ME_EMPTY_MESSAGE}
          </EmptyMessage>
        }
        ListFooterComponent={<ListLoadingFooter loading={isFetchingNextPage} />}
      />
    )}
  </ScreenContainer>
);

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
