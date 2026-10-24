import {demoRecipeListFilters, makeRecipeDetail} from '@eciperay/client';
import type {RecipeDetail} from '@eciperay/types';
import {useState} from 'react';

import {RecipesListView} from '../components/recipes/RecipesListView';

/**
 * EXPERIMENT ONLY (spudly/eciperay#205 diagnosis, throwaway branch — never
 * merge): renders the real RecipesListView with fixture data, bypassing
 * auth/navigation, so a CI emulator can screenshot the exact on-device symptom
 * (giant recipe cards with no title/subtitle text) using the app's own bundle,
 * module resolution, and release build. Fixtures mirror Stephen's real library:
 * ordinary short titles, most with imageUrl null, one with his real Supabase
 * image URL.
 */
const RECIPES: RecipeDetail[] = [
  makeRecipeDetail({
    id: 'exp-r1',
    title: 'Chili',
    servings: 6,
    cookTimeMin: null,
    satietyScore: 65,
    imageUrl: null,
  }),
  makeRecipeDetail({
    id: 'exp-r2',
    title: 'Smashed Cucumber Salad',
    servings: 4,
    cookTimeMin: null,
    satietyScore: 50,
    imageUrl:
      'https://xlvefaeetaaeexyvqbnq.supabase.co/storage/v1/object/public/recipe-images/4e35e006-2ea0-40f2-8ef9-af42b51f266a/6dc355dc-43a5-4d25-8fd1-d76e4380cda7',
  }),
  makeRecipeDetail({
    id: 'exp-r3',
    title: 'Classic Stuffed Peppers',
    servings: 6,
    cookTimeMin: null,
    satietyScore: 57,
    imageUrl: null,
  }),
  makeRecipeDetail({
    id: 'exp-r4',
    title: 'Slow Cooker Jerk Chicken',
    servings: 6,
    cookTimeMin: 480,
    satietyScore: 48,
    imageUrl: null,
  }),
  makeRecipeDetail({
    id: 'exp-r5',
    title: 'The BEST Macaroni & Cheese',
    servings: 6,
    cookTimeMin: 45,
    satietyScore: 32,
    imageUrl: null,
  }),
  makeRecipeDetail({
    id: 'exp-r6',
    title: 'FRENCH TOAST ROLL UPS',
    servings: 10,
    cookTimeMin: 15,
    satietyScore: 7,
    imageUrl: null,
  }),
];

export const DiagHarness = () => {
  const [search, setSearch] = useState('');

  return (
    <RecipesListView
      {...demoRecipeListFilters()}
      search={search}
      onSearchChange={setSearch}
      isLoading={false}
      recipes={RECIPES}
      isFetchingNextPage={false}
      onRecipePress={() => {
        void 0;
      }}
      onRecipeDelete={() => {
        void 0;
      }}
      onLoadMore={() => {
        void 0;
      }}
    />
  );
};
