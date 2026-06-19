import {queryKeys, recordRecipeView} from '@eciperay/client';
import clsx from 'clsx';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useParams, useSearchParams} from 'react-router-dom';

import {LifecycleStatusBadge} from '../components/recipe/LifecycleStatusBadge.js';
import {RecipeDetailTabPanel} from '../components/recipe/RecipeDetailTabPanel.js';
import {VersionPicker} from '../components/recipe/VersionPicker.js';
import {eciperay} from '../lib/api.js';
import {mergeVersionIntoRecipe} from '../lib/mergeVersionIntoRecipe.js';
import {recipeViewHistoryStorage} from '../lib/recipeViewHistoryStorage.js';

type Tab =
  | 'overview'
  | 'ingredients'
  | 'instructions'
  | 'history'
  | 'nutrition';

const TABS: {key: Tab; label: string}[] = [
  {key: 'overview', label: 'Overview'},
  {key: 'ingredients', label: 'Ingredients'},
  {key: 'instructions', label: 'Instructions'},
  {key: 'history', label: 'Cook History'},
  {key: 'nutrition', label: 'Nutrition'},
];

export const RecipeDetailPage = () => {
  const {recipeId = ''} = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
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
    return (
      <div className="flex items-center justify-center py-16">
        <p>Loading…</p>
      </div>
    );
  }

  const currentServings = servings ?? displayRecipe.servings;
  const scaleFactor = currentServings / displayRecipe.servings;

  return (
    <div className="rounded-xl bg-white shadow-sm">
      <div
        className="
          flex flex-wrap items-center justify-between gap-2 border-b
          border-gray-100 px-4 py-3
        "
      >
        <div className="flex items-center gap-2">
          <LifecycleStatusBadge status={recipe.lifecycleStatus} />
          <VersionPicker
            recipeId={recipeId}
            versions={versions}
            selectedVersionId={activeVersionId}
            onSelect={setSelectedVersionId}
          />
        </div>
      </div>
      <div className="flex border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={clsx('flex-1 py-3 text-xs font-medium', {
              'border-primary text-primary border-b-2': activeTab === tab.key,
              'text-muted': activeTab !== tab.key,
            })}
            onClick={() => {
              setActiveTab(tab.key);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <RecipeDetailTabPanel
        activeTab={activeTab}
        recipe={recipe}
        displayRecipe={displayRecipe}
        versions={versions}
        currentServings={currentServings}
        scaleFactor={scaleFactor}
        onServingsChange={setServings}
      />
    </div>
  );
};
