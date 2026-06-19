import type {QueryClient} from '@tanstack/react-query';

import {queryKeys} from './queryKeys.js';

export const invalidateRecipeQueries = (
  queryClient: QueryClient,
  recipeId: string,
  versionId?: string,
) =>
  Promise.all([
    queryClient.invalidateQueries({queryKey: queryKeys.recipeLists()}),
    queryClient.invalidateQueries({queryKey: queryKeys.recipe(recipeId)}),
    queryClient.invalidateQueries({queryKey: queryKeys.versions(recipeId)}),
    queryClient.invalidateQueries({queryKey: queryKeys.nutrition(recipeId)}),
    ...(versionId
      ? [
          queryClient.invalidateQueries({
            queryKey: queryKeys.version(recipeId, versionId),
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.cookLogs(recipeId, versionId),
          }),
        ]
      : []),
  ]);
