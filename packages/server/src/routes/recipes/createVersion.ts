import type {Response} from 'express';

import {runTransactional} from '../../db/withTransaction.js';
import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {
  isRecipeEditable,
  recipeEditBlockedError,
} from '../../lib/assertRecipeEditable.js';
import {fetchVersionDetail} from '../../lib/fetchVersionDetail.js';
import {getParam} from '../../lib/getParam.js';
import {mapRowToRecipeDetail} from '../../lib/mapRowToRecipeDetail.js';

import {GET_RECIPE_DETAIL_SQL} from './queries.js';
import {
  cloneVersionChildren,
  getNextVersionNumber,
  insertVersion,
  setLineageStatus,
} from './versionQueries.js';

type QueryFn = typeof defaultQuery;

export const createVersion = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipeId = getParam(req, 'id');
  const recipeResult = await queryFn(GET_RECIPE_DETAIL_SQL, [
    recipeId,
    req.userId,
  ]);
  const recipeRow = recipeResult.rows[0];
  if (!recipeRow) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  const recipe = mapRowToRecipeDetail(
    recipeRow as Parameters<typeof mapRowToRecipeDetail>[0],
  );
  if (!isRecipeEditable(recipe.lifecycleStatus)) {
    res.status(409).json({error: recipeEditBlockedError()});
    return;
  }

  const activeVersionId = recipe.versionId;
  const newVersionId = await runTransactional(queryFn, async q => {
    const versionNumber = await getNextVersionNumber(recipeId, q);
    const version = await insertVersion(
      {
        recipeId,
        versionNumber,
        title: recipe.title,
        description: recipe.description,
        servings: recipe.servings,
        prepTimeMin: recipe.prepTimeMin,
        cookTimeMin: recipe.cookTimeMin,
        imageUrl: recipe.imageUrl,
        sourceUrl: recipe.sourceUrl,
        createdVia: 'tweak_manual',
        derivedFromVersionId: activeVersionId,
      },
      q,
    );
    const id = version.rows[0]?.id;
    if (!id) {
      throw new Error('Failed to create version');
    }
    await cloneVersionChildren(activeVersionId, id, q);
    if (recipe.lifecycleStatus === 'idea') {
      await setLineageStatus(recipeId, req.userId, 'evolving', q);
    }
    return id;
  });

  const detail = await fetchVersionDetail(
    newVersionId,
    recipeId,
    req.userId,
    queryFn,
  );
  if (!detail) {
    res.status(500).json({error: 'Failed to fetch created version'});
    return;
  }
  res.status(201).json(detail);
};
