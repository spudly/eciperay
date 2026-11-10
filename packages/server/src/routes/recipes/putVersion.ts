import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {
  autoImageContextFromDetail,
  scheduleAutoGenerateRecipeImage,
} from '../../lib/autoGenerateRecipeImage.js';
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
import {RecipeVersionInputSchema, validate} from '../../lib/schemas.js';

type QueryFn = typeof defaultQuery;

export const putVersion = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(RecipeVersionInputSchema, req, res);
  if (!body.ok) {
    return;
  }
  const recipeId = getParam(req, 'id');
  const versionId = getParam(req, 'versionId');
  const existing = await fetchVersionDetail(
    versionId,
    recipeId,
    req.userId,
    queryFn,
  );
  if (!existing) {
    res.status(404).json({error: 'Version not found'});
    return;
  }
  if (!isVersionEditable(existing, existing.status)) {
    res.status(409).json({error: versionEditBlockedError()});
    return;
  }
  try {
    await saveRecipeFromInput(
      {userId: req.userId, input: body.data, recipeId, versionId},
      queryFn,
    );
  } catch (error) {
    if (error instanceof RecipeNotFoundError) {
      res.status(404).json({error: 'Version not found'});
      return;
    }
    throw error;
  }
  const updated = await fetchVersionDetail(
    versionId,
    recipeId,
    req.userId,
    queryFn,
  );
  if (!updated) {
    res.status(500).json({error: 'Failed to fetch updated version'});
    return;
  }
  // #407: a version save is also a recipe save — a still-imageless
  // recipe gets an auto-generated image (once per recipe).
  scheduleAutoGenerateRecipeImage(
    {
      userId: req.userId,
      supabaseUid: req.supabaseUid,
      recipe: autoImageContextFromDetail({...updated, versionId}),
    },
    queryFn,
  );
  res.json(updated);
};
