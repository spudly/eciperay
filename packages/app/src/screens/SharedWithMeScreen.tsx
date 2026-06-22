import {
  SHARED_WITH_ME_EMPTY_MESSAGE,
  SHARED_WITH_ME_TITLE,
  sharedWithMeInfiniteQueryOptions,
} from '@eciperay/client';
import {useInfiniteQuery} from '@tanstack/react-query';
import React from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';

import {SharedRecipeListCard} from '../components/SharedRecipeListCard';
import {api} from '../lib/api';

const styles = StyleSheet.create({
  listContent: {paddingHorizontal: 16, paddingBottom: 32},
});

export const SharedWithMeScreen = () => {
  const {data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} =
    useInfiniteQuery(
      sharedWithMeInfiniteQueryOptions(params =>
        api.recipes.listSharedWithMe(params),
      ),
    );

  const recipes = data?.pages.flat() ?? [];

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {isLoading ? (
        <Text className="text-muted mt-8 text-center">Loading…</Text>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={r => r.id}
          contentContainerStyle={styles.listContent}
          renderItem={({item}) => <SharedRecipeListCard recipe={item} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Text className="text-muted mt-8 px-4 text-center">
              {SHARED_WITH_ME_EMPTY_MESSAGE}
            </Text>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <Text className="text-muted py-4 text-center text-sm">
                Loading more…
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
};

export const sharedWithMeScreenOptions = {title: SHARED_WITH_ME_TITLE};
