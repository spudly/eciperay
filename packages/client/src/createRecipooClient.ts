import type {ApiClient} from './createApiClient.js';
import {createAiApi} from './aiApi.js';
import {createAuthApi} from './authApi.js';
import {createDraftsApi} from './draftsApi.js';
import {createImportApi} from './importApi.js';
import {createNotesApi} from './notesApi.js';
import {createRecipesApi} from './recipesApi.js';
import {createTagsApi} from './tagsApi.js';

export const createRecipooClient = (api: ApiClient) => ({
  recipes: createRecipesApi(api),
  import: createImportApi(api),
  auth: createAuthApi(api),
  tags: createTagsApi(api),
  notes: createNotesApi(api),
  ai: createAiApi(api),
  drafts: createDraftsApi(api),
});

export type RecipooClient = ReturnType<typeof createRecipooClient>;
