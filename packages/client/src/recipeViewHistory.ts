export type RecipeViewHistoryStorage = {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
};

export const RECIPE_VIEW_HISTORY_KEY = 'eciperay:recipe-view-history';
export const RECIPE_VIEW_HISTORY_MAX = 50;

type ViewEntry = {recipeId: string; viewedAt: number};

const readStorageItem = async (
  storage: RecipeViewHistoryStorage,
  key: string,
): Promise<string | null> => {
  const value = storage.getItem(key);
  return value instanceof Promise ? value : value;
};

const writeStorageItem = async (
  storage: RecipeViewHistoryStorage,
  key: string,
  value: string,
): Promise<void> => {
  const result = storage.setItem(key, value);
  if (result instanceof Promise) {
    await result;
  }
};

const parseHistory = (raw: string | null): ViewEntry[] => {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (entry): entry is ViewEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as ViewEntry).recipeId === 'string' &&
        typeof (entry as ViewEntry).viewedAt === 'number',
    );
  } catch {
    return [];
  }
};

const readHistory = async (
  storage: RecipeViewHistoryStorage,
): Promise<ViewEntry[]> => {
  const raw = await readStorageItem(storage, RECIPE_VIEW_HISTORY_KEY);
  return parseHistory(raw);
};

const writeHistory = async (
  storage: RecipeViewHistoryStorage,
  entries: ViewEntry[],
): Promise<void> => {
  await writeStorageItem(
    storage,
    RECIPE_VIEW_HISTORY_KEY,
    JSON.stringify(entries),
  );
};

export const recordRecipeView = async (
  storage: RecipeViewHistoryStorage,
  recipeId: string,
): Promise<void> => {
  const history = await readHistory(storage);
  const filtered = history.filter(entry => entry.recipeId !== recipeId);
  const next = [{recipeId, viewedAt: Date.now()}, ...filtered].slice(
    0,
    RECIPE_VIEW_HISTORY_MAX,
  );
  await writeHistory(storage, next);
};

export const getRecentRecipeIds = async (
  storage: RecipeViewHistoryStorage,
  limit: number,
): Promise<string[]> => {
  const history = await readHistory(storage);
  return history.slice(0, limit).map(entry => entry.recipeId);
};

export const removeRecipeView = async (
  storage: RecipeViewHistoryStorage,
  recipeId: string,
): Promise<void> => {
  const history = await readHistory(storage);
  const next = history.filter(entry => entry.recipeId !== recipeId);
  if (next.length === history.length) {
    return;
  }
  await writeHistory(storage, next);
};
