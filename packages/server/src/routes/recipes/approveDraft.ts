import type {Response} from 'express';
import type {RecipeDiff} from '@recipoo/types';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';

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

const markDraft = (
  draftId: string,
  status: 'approved' | 'rejected',
  queryFn: QueryFn,
) =>
  queryFn('update recipe_drafts set status=$2 where id=$1', [draftId, status]);

const applyAndMarkApproved = async (
  recipeId: string,
  draftId: string,
  diff: RecipeDiff,
  queryFn: QueryFn,
) => {
  await applyDiff(recipeId, diff, queryFn);
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
  await applyAndMarkApproved(recipeId, draftId, draft.diff_json, queryFn);
  res.json({status: 'approved'});
};

export const rejectDraft = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const draftId = getParam(req, 'draftId');
  const result = await markDraft(draftId, 'rejected', queryFn);
  if (result.rowCount === 0) {
    res.status(404).json({error: 'Draft not found'});
    return;
  }
  res.json({status: 'rejected'});
};
