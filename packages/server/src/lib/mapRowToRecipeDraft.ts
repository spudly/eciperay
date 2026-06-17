import type {RecipeDetail, RecipeDiff, RecipeDraft} from '@eciperay/types';

type RecipeDraftRow = {
  id: string;
  recipe_id: string;
  status: RecipeDraft['status'];
  snapshot_json: RecipeDetail;
  diff_json: RecipeDiff;
  trigger: RecipeDraft['trigger'];
  summary_of_changes: string;
  created_at: string;
};

export const mapRowToRecipeDraft = (row: RecipeDraftRow): RecipeDraft => ({
  id: row.id,
  recipeId: row.recipe_id,
  status: row.status,
  snapshotJson: row.snapshot_json,
  diffJson: row.diff_json,
  trigger: row.trigger,
  summaryOfChanges: row.summary_of_changes,
  createdAt: row.created_at,
});
