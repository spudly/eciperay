import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';

import {GET_RECIPE_DETAIL_SQL} from './queries.js';

type QueryFn = typeof defaultQuery;

type UpdateBody = {
  title?: string;
  description?: string | null;
  servings?: number;
  prepTimeMin?: number | null;
  cookTimeMin?: number | null;
  imageUrl?: string | null;
  starRating?: 1 | 2 | 3 | 4 | 5 | null;
};

const UPDATE_RECIPE_SQL = `
  update recipes
  set title         = coalesce($3, title),
      description   = coalesce($4, description),
      servings      = coalesce($5, servings),
      prep_time_min = coalesce($6, prep_time_min),
      cook_time_min = coalesce($7, cook_time_min),
      image_url     = coalesce($8, image_url),
      star_rating   = coalesce($9, star_rating)
  where id = $1 and user_id = $2
  returning id
`;

const updateParams = (req: AuthedRequest) => {
  const b = req.body as UpdateBody;
  return [
    getParam(req, 'id'),
    req.userId,
    b.title,
    b.description,
    b.servings,
    b.prepTimeMin,
    b.cookTimeMin,
    b.imageUrl,
    b.starRating,
  ];
};

export const updateRecipe = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const result = await queryFn(UPDATE_RECIPE_SQL, updateParams(req));
  if (result.rowCount === 0) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  const detail = await queryFn(GET_RECIPE_DETAIL_SQL, [
    getParam(req, 'id'),
    req.userId,
  ]);
  res.json(detail.rows[0]);
};
