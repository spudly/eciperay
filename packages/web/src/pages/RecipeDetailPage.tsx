import {queryKeys, recordRecipeView} from '@eciperay/client';
import clsx from 'clsx';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useCallback, useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';

import {IngredientsTab} from '../components/recipe/IngredientsTab.js';
import {InstructionsTab} from '../components/recipe/InstructionsTab.js';
import {NotesTab} from '../components/recipe/NotesTab.js';
import {NutritionTab} from '../components/recipe/NutritionTab.js';
import {OverviewTab} from '../components/recipe/OverviewTab.js';
import {eciperay} from '../lib/api.js';
import {recipeViewHistoryStorage} from '../lib/recipeViewHistoryStorage.js';

type Tab = 'overview' | 'ingredients' | 'instructions' | 'notes' | 'nutrition';

const TABS: {key: Tab; label: string}[] = [
  {key: 'overview', label: 'Overview'},
  {key: 'ingredients', label: 'Ingredients'},
  {key: 'instructions', label: 'Instructions'},
  {key: 'notes', label: 'Notes'},
  {key: 'nutrition', label: 'Nutrition'},
];

export const RecipeDetailPage = () => {
  const {recipeId = ''} = useParams();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [servings, setServings] = useState<number | null>(null);
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

  if (isLoading || !recipe) {
    return (
      <div className="flex items-center justify-center py-16">
        <p>Loading…</p>
      </div>
    );
  }

  const currentServings = servings ?? recipe.servings;
  const scaleFactor = currentServings / recipe.servings;

  return (
    <div className="rounded-xl bg-white shadow-sm">
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
      {activeTab === 'overview' && (
        <OverviewTab
          recipe={recipe}
          servings={currentServings}
        />
      )}
      {activeTab === 'ingredients' && (
        <IngredientsTab
          recipe={recipe}
          scaleFactor={scaleFactor}
          servings={currentServings}
          onServingsChange={setServings}
        />
      )}
      {activeTab === 'instructions' && <InstructionsTab recipe={recipe} />}
      {activeTab === 'notes' && <NotesTab recipeId={recipe.id} />}
      {activeTab === 'nutrition' && <NutritionTab recipeId={recipe.id} />}
    </div>
  );
};
