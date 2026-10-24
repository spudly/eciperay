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
export const EXP_RECIPES: RecipeDetail[] = [
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

/**
 * RESUMED INVESTIGATION (2026-10-24): Stephen's library is 53 recipes and EVERY
 * card is broken on his Pixel 8a, across many versions, reinstall-proof, while
 * the recipe detail page renders fine. The first matrix ran only the 6 rows
 * above. EXP_RECIPES now totals 53 — Stephen's real count — with a realistic
 * spread: mostly imageUrl null, a handful sharing his one real Supabase image
 * URL (the pattern his library actually has), short and long wrapping titles,
 * varied servings/cook times/satiety. The capture script additionally sweeps
 * device font scale and display density per run, so the library-size and
 * device-settings leads are exercised together.
 */
const EXP_IMAGE_URL =
  'https://xlvefaeetaaeexyvqbnq.supabase.co/storage/v1/object/public/recipe-images/4e35e006-2ea0-40f2-8ef9-af42b51f266a/6dc355dc-43a5-4d25-8fd1-d76e4380cda7';

const EXP_EXTRA_TITLES: readonly string[] = [
  'Beef Stew',
  'Chicken Tikka Masala with Basmati Rice and Garlic Naan',
  'Pancakes',
  'Greek Salad',
  'Beef and Broccoli Stir Fry',
  'Tomato Soup',
  'Grilled Cheese Sandwich',
  'Shrimp Scampi',
  'Vegetable Curry',
  'BBQ Pulled Pork',
  'Caesar Salad',
  'Chicken Noodle Soup',
  'Fish Tacos with Chipotle Crema',
  'Mushroom Risotto',
  'Blueberry Muffins',
  'Egg Fried Rice',
  'Lentil Soup',
  'Chicken Parmesan',
  'Beef Chili Verde',
  'Caprese Salad',
  'Pork Chops with Apples',
  'Vegetable Lasagna',
  'Chicken Enchiladas',
  'Minestrone',
  'Garlic Butter Pasta',
  'Tuna Salad',
  'Beef Burritos',
  'Corn Chowder',
  'Spinach and Feta Stuffed Chicken Breast with Lemon Butter Sauce',
  'Oatmeal Raisin Cookies',
  'Chicken Fried Rice',
  'Tomato Basil Pasta',
  'Pulled Chicken Sandwiches',
  'Zucchini Bread',
  'Beef Stroganoff',
  'Garden Salad',
  'Baked Salmon',
  'Potato Leek Soup',
  'Chicken Pot Pie',
  'Veggie Burger',
  'Shrimp Fried Rice',
  'Butternut Squash Soup',
  'Meatloaf',
  'Chicken Shawarma',
  'Pesto Pasta',
  'Breakfast Burrito',
  'Clam Chowder',
];

const EXP_EXTRA_RECIPES: RecipeDetail[] = EXP_EXTRA_TITLES.map((title, index) =>
  makeRecipeDetail({
    id: `exp-x${index + 1}`,
    title,
    servings: (index % 8) + 1,
    cookTimeMin: index % 3 === 0 ? null : 10 + ((index * 7) % 50),
    satietyScore: (index * 13) % 100,
    // A small minority carry an image, mirroring his library's pattern.
    imageUrl: index % 9 === 4 ? EXP_IMAGE_URL : null,
  }),
);

EXP_RECIPES.push(...EXP_EXTRA_RECIPES);

export const DiagHarness = () => {
  const [search, setSearch] = useState('');

  return (
    <RecipesListView
      {...demoRecipeListFilters()}
      search={search}
      onSearchChange={setSearch}
      isLoading={false}
      recipes={EXP_RECIPES}
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
