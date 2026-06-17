import type {RecipeViewHistoryStorage} from '@eciperay/client';

export const recipeViewHistoryStorage: RecipeViewHistoryStorage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => {
    localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
  },
};
