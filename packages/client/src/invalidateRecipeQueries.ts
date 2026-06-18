import type {QueryClient} from '@tanstack/react-query';

import {queryKeys} from './queryKeys.js';

export const invalidateRecipeQueries = (
  queryClient: QueryClient,
  recipeId: string,
) =>
  Promise.all([
    queryClient.invalidateQueries({queryKey: queryKeys.recipeLists()}),
    queryClient.invalidateQueries({queryKey: queryKeys.recipe(recipeId)}),
    queryClient.invalidateQueries({queryKey: queryKeys.notes(recipeId)}),
    queryClient.invalidateQueries({queryKey: queryKeys.conversation(recipeId)}),
    queryClient.invalidateQueries({queryKey: queryKeys.nutrition(recipeId)}),
    queryClient.invalidateQueries({queryKey: queryKeys.drafts(recipeId)}),
  ]);
