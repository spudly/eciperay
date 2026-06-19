import type {ApiClient} from './createApiClient.js';
import {createAiApi} from './aiApi.js';
import {createAuthApi} from './authApi.js';
import {createCookLogsApi} from './cookLogsApi.js';
import {createImportApi} from './importApi.js';
import {createRecipesApi} from './recipesApi.js';
import {createTagsApi} from './tagsApi.js';
import {createTweakAiApi} from './tweakAiApi.js';
import {createVersionsApi} from './versionsApi.js';

export const createEciperayClient = (api: ApiClient) => ({
  recipes: createRecipesApi(api),
  import: createImportApi(api),
  auth: createAuthApi(api),
  tags: createTagsApi(api),
  ai: createAiApi(api),
  versions: createVersionsApi(api),
  cookLogs: createCookLogsApi(api),
  tweakAi: createTweakAiApi(api),
});

export type EciperayClient = ReturnType<typeof createEciperayClient>;
