export const queryKeys = {
  recipeLists: () => ['recipes'] as const,
  recipes: (search = '') => ['recipes', {search}] as const,
  recipe: (id: string) => ['recipe', id] as const,
  versions: (recipeId: string) => ['versions', recipeId] as const,
  version: (recipeId: string, versionId: string) =>
    ['version', recipeId, versionId] as const,
  cookLogs: (recipeId: string, versionId: string) =>
    ['cookLogs', recipeId, versionId] as const,
  nutrition: (id: string) => ['nutrition', id] as const,
  tags: () => ['tags'] as const,
};
