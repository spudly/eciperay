import type {RecipeDetail, RecipeDiff, DraftTrigger} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

type QueryFn = typeof defaultQuery;

type SaveDraftOptions = {
  recipeId: string;
  snapshot: RecipeDetail;
  diff: RecipeDiff;
  trigger: DraftTrigger;
  summary: string;
};

export const saveDraft = (
  {recipeId, snapshot, diff, trigger, summary}: SaveDraftOptions,
  queryFn: QueryFn,
) =>
  queryFn(
    `insert into recipe_drafts
       (recipe_id, status, snapshot_json, diff_json, trigger, summary_of_changes)
     values ($1, 'pending', $2, $3, $4, $5)
     returning *`,
    [
      recipeId,
      JSON.stringify(snapshot),
      JSON.stringify(diff),
      trigger,
      summary,
    ],
  );
