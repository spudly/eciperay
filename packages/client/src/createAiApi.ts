import type {
  CreateAiImplementResult,
  CreateAiRecipeResult,
  CreateAiSession,
  CreateAiSessionStartResult,
} from '@eciperay/types';

import type {ApiClient} from './createApiClient.js';

/* eslint-disable max-lines-per-function -- API method map */
export const createCreateAiApi = (client: ApiClient) => ({
  start: (prompt: string) =>
    client.fetch<CreateAiSessionStartResult>('/recipes/import/ai/sessions', {
      method: 'POST',
      body: JSON.stringify({prompt}),
    }),
  get: (sessionId: string) =>
    client.fetch<{session: CreateAiSession}>(
      `/recipes/import/ai/sessions/${sessionId}`,
    ),
  sendMessage: (sessionId: string, content: string) =>
    client.fetch<{session: CreateAiSession; reply: string}>(
      `/recipes/import/ai/sessions/${sessionId}/messages`,
      {method: 'POST', body: JSON.stringify({content})},
    ),
  approvePlan: (sessionId: string) =>
    client.fetch<CreateAiImplementResult>(
      `/recipes/import/ai/sessions/${sessionId}/approve-plan`,
      {method: 'POST'},
    ),
  createRecipe: (sessionId: string) =>
    client.fetch<CreateAiRecipeResult>(
      `/recipes/import/ai/sessions/${sessionId}/create-recipe`,
      {method: 'POST'},
    ),
  cancel: (sessionId: string) =>
    client.fetch<{session: CreateAiSession}>(
      `/recipes/import/ai/sessions/${sessionId}/cancel`,
      {method: 'POST'},
    ),
});
