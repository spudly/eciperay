export type AnalyticsPlatform = 'web' | 'ios' | 'android';

export type RecipeImportSource = 'url' | 'image' | 'text' | 'bulk' | 'ai';

export const RECIPE_IMPORT_SOURCES = [
  'url',
  'image',
  'text',
  'bulk',
  'ai',
] as const satisfies readonly RecipeImportSource[];

export type RecipeCreateSource = 'manual' | RecipeImportSource;

export const RECIPE_CREATE_SOURCES = [
  'manual',
  ...RECIPE_IMPORT_SOURCES,
] as const satisfies readonly RecipeCreateSource[];

export type AnalyticsEventProperties = {
  recipe_created: {recipe_id: string; source: RecipeCreateSource};
  recipe_deleted: {recipe_id: string};
  recipe_imported: {recipe_id: string; source: RecipeImportSource};
};

export type AnalyticsEventName = keyof AnalyticsEventProperties;

export const ANALYTICS_EVENT_NAMES = [
  'recipe_created',
  'recipe_deleted',
  'recipe_imported',
] as const satisfies readonly AnalyticsEventName[];
