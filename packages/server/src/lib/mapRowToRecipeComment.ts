import type {RecipeComment} from '@eciperay/types';

import {isCommentStale} from './isCommentStale.js';

export type RecipeCommentRow = {
  id: string;
  recipe_id: string;
  user_id: string;
  author_display_name: string | null;
  body: string;
  content_revision: number | null;
  created_at: string;
  updated_at: string;
};

export const mapRowToRecipeComment = (
  row: RecipeCommentRow,
  recipeContentRevision: number,
): RecipeComment => ({
  id: row.id,
  recipeId: row.recipe_id,
  authorUserId: row.user_id,
  authorDisplayName: row.author_display_name,
  body: row.body,
  contentRevision: row.content_revision,
  isStale: isCommentStale(row.content_revision, recipeContentRevision),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
