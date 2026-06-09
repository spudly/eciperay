import type {AiConversation, NutritionInfo, RecipeDraft} from '@recipoo/types';

import type {ApiClient} from './createApiClient.js';

type Substitution = {ingredient: string; suggestions: string[]};

type ChatResult = {assistantMessage: string; draft: RecipeDraft};

type GenerateImageInput = {
  title: string;
  description?: string | null;
  ingredients?: string[];
};

type GenerateImageResult = {imageBase64: string; contentType: string};

export const createAiApi = (client: ApiClient) => ({
  getConversation: (recipeId: string) =>
    client.fetch<AiConversation>(`/recipes/${recipeId}/ai/conversation`),
  chat: (recipeId: string, message: string) =>
    client.fetch<ChatResult>(`/recipes/${recipeId}/ai/chat`, {
      method: 'POST',
      body: JSON.stringify({message}),
    }),
  cleanup: (recipeId: string) =>
    client.fetch<{draft: RecipeDraft}>(`/recipes/${recipeId}/ai/cleanup`, {
      method: 'POST',
    }),
  nutrition: (recipeId: string) =>
    client.fetch<NutritionInfo>(`/recipes/${recipeId}/ai/nutrition`),
  substitutions: (recipeId: string, missing: string[]) => {
    const params = new URLSearchParams();
    for (const item of missing) {
      params.append('missing', item);
    }
    return client.fetch<Substitution[]>(
      `/recipes/${recipeId}/ai/substitutions?${params.toString()}`,
    );
  },
  generateImage: (input: GenerateImageInput) =>
    client.fetch<GenerateImageResult>('/recipes/ai/generate-image', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
});
