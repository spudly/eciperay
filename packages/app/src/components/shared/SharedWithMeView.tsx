import {
  SHARED_WITH_ME_EMPTY_MESSAGE,
  type SharedWithMeViewProps,
} from '@eciperay/client';
import {FlatList, StyleSheet} from 'react-native';
import {makeRecipeDetail} from '@eciperay/client';

import {SharedRecipeListCard} from '../SharedRecipeListCard';
import {InlineLoadingIndicator} from '../InlineLoadingIndicator';
import {EmptyMessage} from '../ui/EmptyMessage';
import {ListLoadingFooter} from '../ui/ListLoadingFooter';
import {ScreenContainer} from '../ui/ScreenContainer';

const styles = StyleSheet.create({
  listContent: {paddingHorizontal: 16, paddingBottom: 32},
});

export const SharedWithMeView = ({
  isLoading,
  recipes,
  isFetchingNextPage,
  onLoadMore,
}: SharedWithMeViewProps) => (
  <ScreenContainer variant="list">
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
      isLoading={false}
      recipes={[makeRecipeDetail()]}
      isFetchingNextPage={false}
      onLoadMore={() => {
        void 0;
      }}
    />
  );
}
