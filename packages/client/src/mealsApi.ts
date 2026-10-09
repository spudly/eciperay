import type {Meal, MealCookPlan, MealDetail, MealInput} from '@eciperay/types';

import type {ApiClient} from './createApiClient.js';

export const createMealsApi = (client: ApiClient) => ({
  list: () => client.fetch<Meal[]>('/meals'),
  get: (id: string) => client.fetch<MealDetail>(`/meals/${id}`),
  create: (input: MealInput) =>
    client.fetch<MealDetail>('/meals', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  put: (id: string, input: MealInput) =>
    client.fetch<MealDetail>(`/meals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  delete: (id: string) =>
    client.fetch<undefined>(`/meals/${id}`, {method: 'DELETE'}),
  cookPlan: (id: string, opts?: {refresh?: boolean}) => {
    const params = new URLSearchParams();
    if (opts?.refresh) {
      params.set('refresh', 'true');
    }
    const query = params.toString();
    return client.fetch<MealCookPlan>(
      `/meals/${id}/cook-plan${query ? `?${query}` : ''}`,
    );
  },
});
