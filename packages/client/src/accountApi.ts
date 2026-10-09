import type {AccountExportBundle, NutritionGoals} from '@eciperay/types';

import type {ApiClient} from './createApiClient.js';

export const createAccountApi = (client: ApiClient) => ({
  exportData: () => client.fetch<AccountExportBundle>('/account/export'),
  getNutritionGoals: () =>
    client.fetch<NutritionGoals>('/account/nutrition-goals'),
  putNutritionGoals: (goals: NutritionGoals) =>
    client.fetch<NutritionGoals>('/account/nutrition-goals', {
      method: 'PUT',
      body: JSON.stringify(goals),
    }),
  deleteAccount: () => client.fetch<undefined>('/account', {method: 'DELETE'}),
});
