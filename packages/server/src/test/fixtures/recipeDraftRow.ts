import type {RecipeDraft} from '@eciperay/types';

import {makeRecipeDraft} from './recipeDraft.js';

export const makeRecipeDraftRow = (
  overrides: Partial<RecipeDraft> & {
    recipe_id?: string;
    snapshot_json?: RecipeDraft['snapshotJson'];
    diff_json?: RecipeDraft['diffJson'];
    summary_of_changes?: string;
    created_at?: string;
  } = {},
) => {
  const draft = makeRecipeDraft(overrides);
  return {
    id: draft.id,
    recipe_id: overrides.recipe_id ?? draft.recipeId,
    status: draft.status,
    snapshot_json: overrides.snapshot_json ?? draft.snapshotJson,
    diff_json: overrides.diff_json ?? draft.diffJson,
    trigger: draft.trigger,
    summary_of_changes: overrides.summary_of_changes ?? draft.summaryOfChanges,
    created_at: overrides.created_at ?? draft.createdAt,
  };
};

export {makeRecipeDiff} from './recipeDraft.js';
