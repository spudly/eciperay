import type {
  CreateTweakAiSessionResult,
  TweakAiApproveResult,
  TweakAiImplementResult,
  TweakAiSession,
} from '@eciperay/types';

import type {ApiClient} from './createApiClient.js';

/* eslint-disable max-lines-per-function -- API method map */
export const createTweakAiApi = (client: ApiClient) => ({
  start: (recipeId: string, prompt: string) =>
    client.fetch<CreateTweakAiSessionResult>(
      `/recipes/${recipeId}/tweak-ai-sessions`,
      {method: 'POST', body: JSON.stringify({prompt})},
    ),
  get: (recipeId: string, sessionId: string) =>
    client.fetch<{session: TweakAiSession}>(
      `/recipes/${recipeId}/tweak-ai-sessions/${sessionId}`,
    ),
  sendMessage: (recipeId: string, sessionId: string, content: string) =>
    client.fetch<{session: TweakAiSession; reply: string}>(
      `/recipes/${recipeId}/tweak-ai-sessions/${sessionId}/messages`,
      {method: 'POST', body: JSON.stringify({content})},
    ),
  approvePlan: (recipeId: string, sessionId: string) =>
    client.fetch<TweakAiImplementResult>(
      `/recipes/${recipeId}/tweak-ai-sessions/${sessionId}/approve-plan`,
      {method: 'POST'},
    ),
  implement: (recipeId: string, sessionId: string) =>
    client.fetch<TweakAiImplementResult>(
      `/recipes/${recipeId}/tweak-ai-sessions/${sessionId}/implement`,
      {method: 'POST'},
    ),
  createVersion: (recipeId: string, sessionId: string) =>
    client.fetch<TweakAiApproveResult>(
      `/recipes/${recipeId}/tweak-ai-sessions/${sessionId}/create-version`,
      {method: 'POST'},
    ),
  cancel: (recipeId: string, sessionId: string) =>
    client.fetch<{session: TweakAiSession}>(
      `/recipes/${recipeId}/tweak-ai-sessions/${sessionId}/cancel`,
      {method: 'POST'},
    ),
});
