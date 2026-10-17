import type {
  AccountExportBundle,
  Entitlement,
  NutritionGoals,
  PersonalAccessToken,
  PersonalAccessTokenWithSecret,
} from '@eciperay/types';

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
  getEntitlement: () => client.fetch<Entitlement>('/account/entitlement'),
  listPersonalAccessTokens: () =>
    client.fetch<PersonalAccessToken[]>('/account/personal-access-tokens'),
  createPersonalAccessToken: (name: string) =>
    client.fetch<PersonalAccessTokenWithSecret>(
      '/account/personal-access-tokens',
      {method: 'POST', body: JSON.stringify({name})},
    ),
  revokePersonalAccessToken: (id: string) =>
    client.fetch<undefined>(`/account/personal-access-tokens/${id}`, {
      method: 'DELETE',
    }),
});
