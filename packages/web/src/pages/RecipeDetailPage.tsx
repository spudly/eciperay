import {queryKeys, recordRecipeView} from '@eciperay/client';
import type {RecipeDetailTab} from '@eciperay/client';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useParams, useSearchParams} from 'react-router-dom';

import {RecipeDetailChrome} from '../components/recipe/RecipeDetailChrome.js';
import {RecipeDetailTabPanel} from '../components/recipe/RecipeDetailTabPanel.js';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';
import {eciperay} from '../lib/api.js';
import {mergeVersionIntoRecipe} from '../lib/mergeVersionIntoRecipe.js';
import {recipeViewHistoryStorage} from '../lib/recipeViewHistoryStorage.js';

export const RecipeDetailPage = () => {
  const {recipeId = ''} = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<RecipeDetailTab>('overview');
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

  const {data: recipe, isLoading} = useQuery({
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

  if (isLoading || !recipe || !displayRecipe) {
    return <ScreenLoadingGate pending>{null}</ScreenLoadingGate>;
  }

  const currentServings = servings ?? displayRecipe.servings;
  const scaleFactor = currentServings / displayRecipe.servings;

  return (
    <RecipeDetailChrome
      status={recipe.status}
      recipeId={recipeId}
      versions={versions}
      selectedVersionId={activeVersionId}
      onSelectVersion={setSelectedVersionId}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
    >
      <RecipeDetailTabPanel
        activeTab={activeTab}
        recipe={recipe}
        displayRecipe={displayRecipe}
        versions={versions}
        currentServings={currentServings}
        scaleFactor={scaleFactor}
        onServingsChange={setServings}
      />
    </RecipeDetailChrome>
  );
};
