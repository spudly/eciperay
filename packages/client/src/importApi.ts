import type {
  BulkImportResult,
  CreateRecipeResult,
  RecipeDetail,
  RecipeExportBundle,
} from '@eciperay/types';

import type {ApiClient, ApiError} from './createApiClient.js';

/**
 * Machine-readable error code the import endpoints return (HTTP 409) when
 * the imported recipe already exists in the user's library (#296). The
 * human-readable warning rides in the error message; resubmitting the same
 * import with `allowDuplicate` creates a second copy anyway.
 */
export const DUPLICATE_RECIPE_ERROR_CODE = 'duplicate_recipe';

/** True when an import call failed with the duplicate-recipe warning. */
export const isDuplicateRecipeError = (error: unknown): boolean =>
  (error as ApiError | null | undefined)?.code === DUPLICATE_RECIPE_ERROR_CODE;

export type ImportOptions = {
  /** Import even though the recipe duplicates an existing library entry. */
  allowDuplicate?: boolean;
};

export const createImportApi = (client: ApiClient) => ({
  importUrl: (url: string, options?: ImportOptions) =>
    client.fetch<RecipeDetail & CreateRecipeResult>('/recipes/import/url', {
      method: 'POST',
      body: JSON.stringify({url, allowDuplicate: options?.allowDuplicate}),
    }),
  importImage: (imageBase64: string, options?: ImportOptions) =>
    client.fetch<RecipeDetail & CreateRecipeResult>('/recipes/import/image', {
      method: 'POST',
      body: JSON.stringify({
        imageBase64,
        allowDuplicate: options?.allowDuplicate,
      }),
    }),
  importText: (text: string, options?: ImportOptions) =>
    client.fetch<RecipeDetail & CreateRecipeResult>('/recipes/import/text', {
      method: 'POST',
      body: JSON.stringify({text, allowDuplicate: options?.allowDuplicate}),
    }),
  importBulk: (
    bundle: RecipeExportBundle | Pick<RecipeExportBundle, 'recipes'>,
  ) =>
    client.fetch<BulkImportResult>('/recipes/import/bulk', {
      method: 'POST',
      body: JSON.stringify(bundle),
    }),
});
