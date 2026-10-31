import {queryKeys, recordRecipeView} from '@eciperay/client';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useParams, useSearchParams} from 'react-router-dom';

import {RouteErrorView} from '../components/RouteErrorView.js';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';
import {eciperay} from '../lib/api.js';
import {mergeVersionIntoRecipe} from '../lib/mergeVersionIntoRecipe.js';
import {recipeViewHistoryStorage} from '../lib/recipeViewHistoryStorage.js';

import {RecipeDetailHost} from './RecipeDetailHost.js';

export const RecipeDetailPage = () => {
  const {recipeId = ''} = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [servings, setServings] = useState<number | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    () => searchParams.get('versionId'),
  );
  const queryClient = useQueryClient();

  const invalidateRecentlyViewed = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.recipes('home-recently-viewed'),
    });
  }, [queryClient]);

  useEffect(() => {
    if (!recipeId) {
      return;
    }
    void recordRecipeView(recipeViewHistoryStorage, recipeId).then(() => {
      invalidateRecentlyViewed();
    });
  }, [recipeId, invalidateRecentlyViewed]);

  const {
    data: recipe,
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.recipe(recipeId),
    queryFn: () => eciperay.recipes.get(recipeId),
    enabled: recipeId.length > 0,
  });

  const activeVersionId = selectedVersionId ?? recipe?.versionId ?? '';

  const {data: versions = []} = useQuery({
    queryKey: queryKeys.versions(recipeId),
    queryFn: () => eciperay.versions.list(recipeId),
    enabled: recipeId.length > 0,
  });

  const viewingAlternateVersion =
    recipe !== undefined && activeVersionId !== recipe.versionId;

  const {data: versionDetail} = useQuery({
    queryKey: queryKeys.version(recipeId, activeVersionId),
    queryFn: () => eciperay.versions.get(recipeId, activeVersionId),
    enabled: recipeId.length > 0 && viewingAlternateVersion,
  });

  const displayRecipe = useMemo(() => {
    if (!recipe) {
      return null;
    }
    if (viewingAlternateVersion && versionDetail) {
      return mergeVersionIntoRecipe(recipe, versionDetail);
    }
    return recipe;
  }, [recipe, viewingAlternateVersion, versionDetail]);

  useEffect(() => {
    setServings(null);
  }, [activeVersionId]);

  useEffect(() => {
    const versionId = searchParams.get('versionId');
    if (!versionId || !recipeId) {
      return;
    }
    setSelectedVersionId(versionId);
    const next = new URLSearchParams(searchParams);
    next.delete('versionId');
    setSearchParams(next, {replace: true});
  }, [recipeId, searchParams, setSearchParams]);

  // The recipes route answers a missing recipe with 404 and
  // `{error: 'Recipe not found'}`, which the API client throws as that
  // message (a body without an `error` field falls back to
  // `API error <status>:`); either shape reads as not found.
  const isNotFoundError =
    error instanceof Error &&
    (error.message === 'Recipe not found' ||
      error.message.startsWith('API error 404'));

  // A 404 wins over a cached recipe: after a recipe is deleted elsewhere,
  // a detail refetch answers 404 while TanStack Query retains the cached
  // data, so gating only on `!recipe` would keep showing the deleted
  // recipe.
  if (isNotFoundError) {
    return <RouteErrorView isNotFound />;
  }

  // No recipe id in the route: nothing can load, so it reads as not
  // found rather than a disabled query's endless pending state.
  if (!recipeId) {
    return <RouteErrorView isNotFound />;
  }

  // A settled query with no recipe means the recipe does not exist
  // (deleted or a bad link): show a not-found state instead of gating on
  // `!recipe` forever, which left the page on the loading skeleton
  // indefinitely (#273). No error at all also reads as not found;
  // anything else is a generic load failure. `isPending`, not
  // `isLoading`: a paused (offline) fetch has isLoading false while the
  // query is still pending, and must stay on the loading gate.
  if (!isPending && !recipe) {
    return <RouteErrorView isNotFound={!error} />;
  }

  if (isPending || !recipe || !displayRecipe) {
    return <ScreenLoadingGate pending>{null}</ScreenLoadingGate>;
  }

  const currentServings = servings ?? displayRecipe.servings;
  const scaleFactor = currentServings / displayRecipe.servings;

  return (
    <RecipeDetailHost
      recipe={recipe}
      displayRecipe={displayRecipe}
      versions={versions}
      selectedVersionId={activeVersionId}
      onSelectVersion={setSelectedVersionId}
      currentServings={currentServings}
      scaleFactor={scaleFactor}
      onServingsChange={setServings}
    />
  );
};
