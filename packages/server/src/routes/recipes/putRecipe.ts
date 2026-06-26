import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {
  isRecipeEditable,
  recipeEditBlockedError,
} from '../../lib/assertRecipeEditable.js';
import {fetchVersionDetail} from '../../lib/fetchVersionDetail.js';
import {getParam} from '../../lib/getParam.js';
import {
  isVersionContentLocked,
  isVersionEditable,
  versionContentLockedError,
} from '../../lib/isVersionEditable.js';
import {recipeContentUnchanged} from '../../lib/recipeContentEquals.js';
import {
  RecipeNotFoundError,
  saveRecipeFromInput,
} from '../../lib/saveRecipeFromInput.js';
import {saveRecipeMetadata} from '../../lib/saveRecipeMetadata.js';
import {
  RecipeInputSchema,
  RecipeMetadataInputSchema,
  validate,
} from '../../lib/schemas.js';

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
  if (!isRecipeEditable(activeVersion.status)) {
    res.status(409).json({error: recipeEditBlockedError()});
    return;
  }

  const contentLocked = isVersionContentLocked(
    activeVersion,
    activeVersion.status,
  );

  if (contentLocked) {
    if (!recipeContentUnchanged(activeVersion, body.data)) {
      res.status(409).json({error: versionContentLockedError()});
      return;
    }
    const metadata = RecipeMetadataInputSchema.safeParse(body.data);
    if (!metadata.success) {
      res.status(400).json({error: metadata.error.message});
      return;
    }
    try {
      const detail = await saveRecipeMetadata(
        {userId: req.userId, recipeId, versionId, input: metadata.data},
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
    return;
  }

  if (!isVersionEditable(activeVersion, activeVersion.status)) {
    res.status(409).json({error: versionContentLockedError()});
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
