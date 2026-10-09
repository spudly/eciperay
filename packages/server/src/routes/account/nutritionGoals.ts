import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {
  fetchNutritionGoals,
  updateNutritionGoals,
} from '../../lib/nutritionGoalsQueries.js';
import {NutritionGoalsSchema, validate} from '../../lib/schemas.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';

type QueryFn = typeof defaultQuery;

export const getNutritionGoals = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  res.json(await fetchNutritionGoals(req.userId, queryFn));
};

export const putNutritionGoals = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(NutritionGoalsSchema, req, res);
  if (!body.ok) {
    return;
  }
  const updated = await updateNutritionGoals(req.userId, body.data, queryFn);
  if (!updated) {
    res.status(404).json({error: 'User not found'});
    return;
  }
  res.json(updated);
};
