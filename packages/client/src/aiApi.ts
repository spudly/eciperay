import type {NutritionInfo} from '@eciperay/types';

import type {ApiClient} from './createApiClient.js';

type Substitution = {ingredient: string; suggestions: string[]};

type GenerateImageIngredient = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
};

type GenerateImageInput = {
  title: string;
  description?: string | null;
  ingredients?: GenerateImageIngredient[];
  instructions?: string[];
};

type GenerateImageResult = {imageBase64: string; contentType: string};

type GenerateDescriptionInput = {
  title: string;
  ingredients?: string[];
  instructions?: string[];
  prepTimeMin?: number | null;
  cookTimeMin?: number | null;
};

type GenerateDescriptionResult = {description: string};

const createGenerateDescription =
  (client: ApiClient) => (input: GenerateDescriptionInput) =>
    client.fetch<GenerateDescriptionResult>(
      '/recipes/ai/generate-description',
      {method: 'POST', body: JSON.stringify(input)},
    );

export const createAiApi = (client: ApiClient) => ({
  nutrition: (recipeId: string, options?: {refresh?: boolean}) => {
    const params = new URLSearchParams();
    if (options?.refresh) {
      params.set('refresh', 'true');
    }
    const query = params.toString();
    return client.fetch<NutritionInfo>(
      `/recipes/${recipeId}/ai/nutrition${query ? `?${query}` : ''}`,
    );
  },
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
  generateDescription: createGenerateDescription(client),
});
