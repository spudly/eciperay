import {queryKeys} from './queryKeys.js';

const emptyFilters = {
  search: '',
  status: '',
  ingredient: '',
  minCalories: null,
  maxCalories: null,
  minProteinG: null,
  maxProteinG: null,
  minSatiety: null,
  maxSatiety: null,
  sort: 'newest',
  sortDir: 'desc',
};

describe('queryKeys', () => {
  test('returns stable key tuples', () => {
    expect(queryKeys.recipeLists()).toEqual(['recipes']);
    expect(queryKeys.recipes()).toEqual(['recipes', emptyFilters]);
    expect(queryKeys.recipes('pasta')).toEqual([
      'recipes',
      {search: 'pasta', status: ''},
    ]);
    expect(queryKeys.recipes('pasta', 'perfected')).toEqual([
      'recipes',
      {search: 'pasta', status: 'perfected'},
    ]);
    expect(queryKeys.recipes({search: 'pasta', sort: 'satiety'})).toEqual([
      'recipes',
      {...emptyFilters, search: 'pasta', sort: 'satiety'},
    ]);
    expect(queryKeys.recipe('r1')).toEqual(['recipe', 'r1']);
    expect(queryKeys.versions('r1')).toEqual(['versions', 'r1']);
    expect(queryKeys.version('r1', 'v1')).toEqual(['version', 'r1', 'v1']);
    expect(queryKeys.cookLogs('r1', 'v1')).toEqual(['cookLogs', 'r1', 'v1']);
    expect(queryKeys.nutrition('r1')).toEqual(['nutrition', 'r1']);
    expect(queryKeys.tags()).toEqual(['tags']);
    expect(queryKeys.publicRecipe('r1', 'pasta', 'token')).toEqual([
      'publicRecipe',
      'r1',
      {slug: 'pasta', shareToken: 'token'},
    ]);
    expect(queryKeys.publicRecipe('r1')).toEqual([
      'publicRecipe',
      'r1',
      {slug: '', shareToken: ''},
    ]);
    expect(queryKeys.sharedWithMe()).toEqual(['sharedWithMe', emptyFilters]);
    expect(queryKeys.recipeComments('r1')).toEqual([
      'recipeComments',
      'r1',
      {shareToken: ''},
    ]);
    expect(queryKeys.recipeComments('r1', 'tok')).toEqual([
      'recipeComments',
      'r1',
      {shareToken: 'tok'},
    ]);
    expect(queryKeys.publicRecipeDiscovery()).toEqual([
      'publicRecipeDiscovery',
      emptyFilters,
    ]);
    expect(queryKeys.publicRecipeDiscovery('curry', 'rating')).toEqual([
      'publicRecipeDiscovery',
      {...emptyFilters, search: 'curry', sort: 'rating'},
    ]);
    expect(queryKeys.meals()).toEqual(['meals']);
    expect(queryKeys.meal('m1')).toEqual(['meal', 'm1']);
    expect(queryKeys.mealCookPlan('m1')).toEqual(['mealCookPlan', 'm1']);
    expect(queryKeys.mealPlans()).toEqual(['mealPlans']);
    expect(queryKeys.mealPlan('p1')).toEqual(['mealPlan', 'p1']);
    expect(queryKeys.mealPlanShoppingList('p1')).toEqual([
      'mealPlanShoppingList',
      'p1',
    ]);
    expect(queryKeys.nutritionGoals()).toEqual(['nutritionGoals']);
  });
});
