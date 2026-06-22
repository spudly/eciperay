import type {PublicRecipeResponse} from '@eciperay/types';
import type {Request, Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {getParam} from '../../lib/getParam.js';
import {getShareTokenFromQuery} from '../../lib/getShareTokenFromQuery.js';
import {mapRowToPublicRecipeDetail} from '../../lib/mapRowToRecipeDetail.js';
import {
  resolvePublicRecipeAccess,
  toRecipeAccessRecord,
} from '../../lib/recipeAccess.js';
import {GET_PUBLIC_RECIPE_DETAIL_SQL} from '../recipes/sqlConstants.js';

type QueryFn = typeof defaultQuery;

export const getPublicRecipe = async (
  req: Request,
  res: Response,
  queryFn: QueryFn,
) => {
  const id = getParam(req, 'id');
  const requestedSlug =
    req.params['slug'] === undefined ? undefined : getParam(req, 'slug');

  const result = await queryFn(GET_PUBLIC_RECIPE_DETAIL_SQL, [id]);
  const row = result.rows[0] as
    | Parameters<typeof mapRowToPublicRecipeDetail>[0]
    | undefined;

  if (!row) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }

  const denial = resolvePublicRecipeAccess(toRecipeAccessRecord(row), {
    shareToken: getShareTokenFromQuery(req),
  });

  if (denial === 'not_found') {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }

  if (denial === 'forbidden') {
    res.status(403).json({error: 'Recipe access denied'});
    return;
  }

  const recipe = mapRowToPublicRecipeDetail(row);
  const canonicalSlug = row.slug;
  const slugMismatch =
    requestedSlug !== undefined &&
    requestedSlug !== '' &&
    requestedSlug !== canonicalSlug;

  const body: PublicRecipeResponse = {
    recipe,
    canonicalSlug,
    ...(slugMismatch ? {slugMismatch: true} : {}),
  };
  res.json(body);
};
