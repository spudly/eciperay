import type {RecipeViewHistoryStorage} from './recipeViewHistory.js';
import {
  getRecentRecipeIds,
  RECIPE_VIEW_HISTORY_KEY,
  recordRecipeView,
  removeRecipeView,
} from './recipeViewHistory.js';

const createMemoryStorage = (): RecipeViewHistoryStorage => {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
};

describe('recipeViewHistory', () => {
  test('records a recipe view at the front of history', async () => {
    const storage = createMemoryStorage();
    await recordRecipeView(storage, 'recipe-a');
    await recordRecipeView(storage, 'recipe-b');

    expect(await getRecentRecipeIds(storage, 5)).toEqual([
      'recipe-b',
      'recipe-a',
    ]);
  });

  test('moves an existing recipe to the front when viewed again', async () => {
    const storage = createMemoryStorage();
    await recordRecipeView(storage, 'recipe-a');
    await recordRecipeView(storage, 'recipe-b');
    await recordRecipeView(storage, 'recipe-a');

    expect(await getRecentRecipeIds(storage, 5)).toEqual([
      'recipe-a',
      'recipe-b',
    ]);
  });

  test('limits returned ids to the requested count', async () => {
    const storage = createMemoryStorage();
    await recordRecipeView(storage, 'recipe-a');
    await recordRecipeView(storage, 'recipe-b');
    await recordRecipeView(storage, 'recipe-c');
    await recordRecipeView(storage, 'recipe-d');

    expect(await getRecentRecipeIds(storage, 3)).toEqual([
      'recipe-d',
      'recipe-c',
      'recipe-b',
    ]);
  });

  test('removes a recipe from history', async () => {
    const storage = createMemoryStorage();
    await recordRecipeView(storage, 'recipe-a');
    await recordRecipeView(storage, 'recipe-b');
    await removeRecipeView(storage, 'recipe-a');

    expect(await getRecentRecipeIds(storage, 5)).toEqual(['recipe-b']);
  });

  test('ignores invalid stored history', async () => {
    const storage = createMemoryStorage();
    await storage.setItem(RECIPE_VIEW_HISTORY_KEY, 'not-json');

    expect(await getRecentRecipeIds(storage, 5)).toEqual([]);
  });
});
