import type {
  MealPlan,
  MealPlanDetail,
  MealPlanInput,
  ShoppingListLine,
} from '@eciperay/types';

import type {ApiClient} from './createApiClient.js';

export const createMealPlansApi = (client: ApiClient) => ({
  list: () => client.fetch<MealPlan[]>('/meal-plans'),
  get: (id: string) => client.fetch<MealPlanDetail>(`/meal-plans/${id}`),
  create: (input: MealPlanInput) =>
    client.fetch<MealPlanDetail>('/meal-plans', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  put: (id: string, input: MealPlanInput) =>
    client.fetch<MealPlanDetail>(`/meal-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  delete: (id: string) =>
    client.fetch<undefined>(`/meal-plans/${id}`, {method: 'DELETE'}),
  shoppingList: (id: string) =>
    client.fetch<ShoppingListLine[]>(`/meal-plans/${id}/shopping-list`),
});
