import type {RecipeShowLess, ShowLessItem} from '@eciperay/types';

import type {ApiClient} from './createApiClient.js';

/**
 * Discovery actions (#622/#623): the "show less like this" soft negative
 * signal. Recording a source down-ranks similar recipes in discovery —
 * it never hides the source itself; undo restores the ranking. The list
 * backs the Settings "Show less like this" list (next to Hidden recipes).
 */
export const createDiscoveryApi = (client: ApiClient) => ({
  showLess: (recipeId: string) =>
    client.fetch<RecipeShowLess>(`/discovery/recipes/${recipeId}/show-less`, {
      method: 'POST',
    }),
  undoShowLess: (recipeId: string) =>
    client.fetch<undefined>(`/discovery/recipes/${recipeId}/show-less`, {
      method: 'DELETE',
    }),
  listShowLess: () => client.fetch<ShowLessItem[]>('/discovery/show-less'),
});
