import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {fetchVersionDetail} from '../../lib/fetchVersionDetail.js';
import {getParam} from '../../lib/getParam.js';
import {
  isVersionEditable,
  versionEditBlockedError,
} from '../../lib/isVersionEditable.js';
import {
  RecipeNotFoundError,
  saveRecipeFromInput,
} from '../../lib/saveRecipeFromInput.js';
import {RecipeInputSchema, validate} from '../../lib/schemas.js';

import {GET_RECIPE_DETAIL_SQL} from './queries.js';

type QueryFn = typeof defaultQuery;

export const putRecipe = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(RecipeInputSchema, req, res);
  if (!body.ok) {
    return;
  }
  const recipeId = getParam(req, 'id');
  const existing = await queryFn(GET_RECIPE_DETAIL_SQL, [recipeId, req.userId]);
  const row = existing.rows[0];
  if (!row) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  const versionId = (row as {version_id: string}).version_id;
  const activeVersion = await fetchVersionDetail(
    versionId,
    recipeId,
    req.userId,
    queryFn,
  );
  if (!activeVersion) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  if (!isVersionEditable(activeVersion, activeVersion.lifecycleStatus)) {
    res.status(409).json({error: versionEditBlockedError()});
    return;
  }
  try {
    const detail = await saveRecipeFromInput(
      {userId: req.userId, input: body.data, recipeId, versionId},
      queryFn,
    );
    res.json(detail);
  } catch (error) {
    if (error instanceof RecipeNotFoundError) {
      res.status(404).json({error: 'Recipe not found'});
      return;
    }
    throw error;
  }
};
