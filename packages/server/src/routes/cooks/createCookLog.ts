import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {fetchVersionDetail} from '../../lib/fetchVersionDetail.js';
import {getParam} from '../../lib/getParam.js';
import {CookLogInputSchema, validate} from '../../lib/schemas.js';
import {updateOwnerStarRating} from '../recipes/recipeRatingQueries.js';

import {mapRowToCookLog} from './mapRowToCookLog.js';

type QueryFn = typeof defaultQuery;

const INSERT_COOK_LOG_SQL = `
  insert into cook_logs (recipe_version_id, user_id, author_star_rating, notes)
  values ($1, $2, $3, $4)
  returning *
`;

export const createCookLog = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(CookLogInputSchema, req, res);
  if (!body.ok) {
    return;
  }
  const recipeId = getParam(req, 'id');
  const versionId = getParam(req, 'versionId');
  const version = await fetchVersionDetail(
    versionId,
    recipeId,
    req.userId,
    queryFn,
  );
  if (!version) {
    res.status(404).json({error: 'Version not found'});
    return;
  }
  const authorStarRating = body.data.authorStarRating ?? null;
  const result = await queryFn(INSERT_COOK_LOG_SQL, [
    versionId,
    req.userId,
    authorStarRating,
    body.data.notes ?? null,
  ]);
  const row = result.rows[0];
  if (!row) {
    res.status(500).json({error: 'Failed to create cook log'});
    return;
  }
  // Cook logs are owner-only; sync the cook rating onto recipes.star_rating
  // so overview and list pick it up (they do not read cook_logs ratings).
  if (authorStarRating !== null) {
    await updateOwnerStarRating(
      recipeId,
      req.userId,
      authorStarRating,
      queryFn,
    );
  }
  res
    .status(201)
    .json(mapRowToCookLog(row as Parameters<typeof mapRowToCookLog>[0]));
};
