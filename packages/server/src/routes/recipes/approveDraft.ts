import type {Response} from 'express';
import type {RecipeDiff} from '@recipoo/types';

import {runTransactional} from '../../db/withTransaction.js';
import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';
import {mapRowToRecipeDetail} from '../../lib/mapRowToRecipeDetail.js';

import {
  GET_RECIPE_DETAIL_SQL,
  deleteIngredientsByRecipeId,
  deleteInstructionsByRecipeId,
  insertIngredients,
  insertInstructions,
} from './queries.js';

type QueryFn = typeof defaultQuery;

type DraftRow = {id: string; recipe_id: string; diff_json: RecipeDiff};

const getDraft = (draftId: string, recipeId: string, queryFn: QueryFn) =>
  queryFn<DraftRow>(
    `select * from recipe_drafts
     where id=$1 and recipe_id=$2 and status='pending'`,
    [draftId, recipeId],
  );

const APPLY_DIFF_SQL = `update recipes set
     title         = coalesce($2, title),
     description   = coalesce($3, description),
     servings      = coalesce($4, servings),
     prep_time_min = coalesce($5, prep_time_min),
     cook_time_min = coalesce($6, cook_time_min)
   where id = $1`;

const diffParams = (recipeId: string, diff: RecipeDiff) => [
  recipeId,
  diff.title,
  diff.description,
  diff.servings,
  diff.prepTimeMin,
  diff.cookTimeMin,
];

const applyDiff = (recipeId: string, diff: RecipeDiff, queryFn: QueryFn) =>
  queryFn(APPLY_DIFF_SQL, diffParams(recipeId, diff));

const applyIngredientDiff = async (
  recipeId: string,
  diff: RecipeDiff,
  queryFn: QueryFn,
) => {
  if (!diff.ingredients) {
    return;
  }
  await deleteIngredientsByRecipeId(recipeId, queryFn);
  await insertIngredients(recipeId, diff.ingredients, queryFn);
};

const applyInstructionDiff = async (
  recipeId: string,
  diff: RecipeDiff,
  queryFn: QueryFn,
) => {
  if (!diff.instructions) {
    return;
  }
  await deleteInstructionsByRecipeId(recipeId, queryFn);
  await insertInstructions(recipeId, diff.instructions, queryFn);
};

const markDraft = (
  draftId: string,
  status: 'approved' | 'rejected',
  queryFn: QueryFn,
) =>
  queryFn('update recipe_drafts set status=$2 where id=$1', [draftId, status]);

const applyDraftChanges = async (
  recipeId: string,
  draftId: string,
  diff: RecipeDiff,
  queryFn: QueryFn,
) => {
  await applyDiff(recipeId, diff, queryFn);
  await applyIngredientDiff(recipeId, diff, queryFn);
  await applyInstructionDiff(recipeId, diff, queryFn);
  await markDraft(draftId, 'approved', queryFn);
};

export const approveDraft = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipeId = getParam(req, 'id');
  const draftId = getParam(req, 'draftId');
  const result = await getDraft(draftId, recipeId, queryFn);
  const draft = result.rows[0];
  if (!draft) {
    res.status(404).json({error: 'Draft not found'});
    return;
  }
  await runTransactional(queryFn, q =>
    applyDraftChanges(recipeId, draftId, draft.diff_json, q),
  );
  const detail = await queryFn(GET_RECIPE_DETAIL_SQL, [recipeId, req.userId]);
  const row = detail.rows[0];
  if (!row) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  res.json(
    mapRowToRecipeDetail(row as Parameters<typeof mapRowToRecipeDetail>[0]),
  );
};

export const rejectDraft = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipeId = getParam(req, 'id');
  const draftId = getParam(req, 'draftId');
  const result = await queryFn(
    `update recipe_drafts set status='rejected'
     where id=$1 and recipe_id=$2 and status='pending'`,
    [draftId, recipeId],
  );
  if (result.rowCount === 0) {
    res.status(404).json({error: 'Draft not found'});
    return;
  }
  res.json({status: 'rejected'});
};
