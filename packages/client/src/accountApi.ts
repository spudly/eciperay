import type {
  AccountExportBundle,
  AuthorDisplaySettings,
  Entitlement,
  FamilyShareGrant,
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
  getAuthorDisplay: () =>
    client.fetch<AuthorDisplaySettings>('/account/author-display'),
  putAuthorDisplay: (settings: AuthorDisplaySettings) =>
    client.fetch<AuthorDisplaySettings>('/account/author-display', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
  deleteAccount: () => client.fetch<undefined>('/account', {method: 'DELETE'}),
  getEntitlement: () => client.fetch<Entitlement>('/account/entitlement'),
  refreshEntitlement: () =>
    client.fetch<Entitlement>('/account/entitlement/refresh', {method: 'POST'}),
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
  // Family sharing (#617): the owner's standing designations. Creating
  // one designates by the recipient's account email — the server looks
  // the account up and errors when no account has that email.
  listFamilySharing: () =>
    client.fetch<FamilyShareGrant[]>('/account/family-sharing'),
  createFamilySharing: (email: string) =>
    client.fetch<FamilyShareGrant>('/account/family-sharing', {
      method: 'POST',
      body: JSON.stringify({email}),
    }),
  deleteFamilySharing: (recipientUserId: string) =>
    client.fetch<undefined>(`/account/family-sharing/${recipientUserId}`, {
      method: 'DELETE',
    }),
});
