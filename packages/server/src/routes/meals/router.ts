import {Router} from 'express';
import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {buildMealCookPlan} from '../../lib/buildMealCookPlan.js';
import {getParam} from '../../lib/getParam.js';
import {listMealsForUser, loadMealDetail} from '../../lib/loadMealDetail.js';
import {deleteMeal, replaceMeal, saveNewMeal} from '../../lib/saveMeal.js';
import {MealInputSchema, validate} from '../../lib/schemas.js';
import {requireAuth, type AuthedRequest} from '../../middleware/requireAuth.js';

type QueryFn = typeof defaultQuery;
const a = (req: Parameters<typeof requireAuth>[0]) => req as AuthedRequest;

const listMeals = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const meals = await listMealsForUser(req.userId, queryFn);
  res.json(meals);
};

const createMeal = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(MealInputSchema, req, res);
  if (!body.ok) {
    return;
  }
  const result = await saveNewMeal(req.userId, body.data, queryFn);
  if ('error' in result) {
    res.status(result.status).json({error: result.error});
    return;
  }
  res.status(201).json(result.meal);
};

const getMeal = async (req: AuthedRequest, res: Response, queryFn: QueryFn) => {
  const meal = await loadMealDetail(getParam(req, 'id'), req.userId, queryFn);
  if (!meal) {
    res.status(404).json({error: 'Meal not found'});
    return;
  }
  res.json(meal);
};

const putMeal = async (req: AuthedRequest, res: Response, queryFn: QueryFn) => {
  const body = validate(MealInputSchema, req, res);
  if (!body.ok) {
    return;
  }
  const result = await replaceMeal(
    getParam(req, 'id'),
    req.userId,
    body.data,
    queryFn,
  );
  if ('error' in result) {
    res.status(result.status).json({error: result.error});
    return;
  }
  res.json(result.meal);
};

const removeMeal = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const result = await deleteMeal(getParam(req, 'id'), req.userId, queryFn);
  if ('error' in result) {
    res.status(result.status).json({error: result.error});
    return;
  }
  res.status(204).send();
};

const getCookPlan = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const refresh =
    req.query['refresh'] === 'true' || req.query['refresh'] === '1';
  const result = await buildMealCookPlan(
    getParam(req, 'id'),
    req.userId,
    queryFn,
    refresh,
  );
  if ('error' in result) {
    res.status(result.status).json({error: result.error});
    return;
  }
  res.json(result.plan);
};

export const createMealsRouter = (queryFn: QueryFn) => {
  const router = Router();
  router.get('/', requireAuth, (req, res) => listMeals(a(req), res, queryFn));
  router.post('/', requireAuth, (req, res) => createMeal(a(req), res, queryFn));
  router.get('/:id', requireAuth, (req, res) => getMeal(a(req), res, queryFn));
  router.put('/:id', requireAuth, (req, res) => putMeal(a(req), res, queryFn));
  router.delete('/:id', requireAuth, (req, res) =>
    removeMeal(a(req), res, queryFn),
  );
  router.get('/:id/cook-plan', requireAuth, (req, res) =>
    getCookPlan(a(req), res, queryFn),
  );
  return router;
};
